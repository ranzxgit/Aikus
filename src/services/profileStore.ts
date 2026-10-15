import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { SupportedLanguage } from '@/config';
import type { ChatMessage } from '@/types/chat';
import type { AnimationPreference, LocalProfile, PinCredential, ProfileSettings } from '@/types/profile';
import { createProfileDataStore } from '@/services/profileData';
import { hashPin, verifyPin } from '@/services/pinSecurity';

const PROFILES_KEY = 'aikus.profiles.v1';
const LANGUAGE_KEY = 'aikus.language.v1';
const LEGACY_LANGUAGE_KEY = 'aikus-language';
const ACTIVE_PROFILE_KEY = 'aikus.active-profile.v1';
const OLLAMA_REACHABLE_KEY = 'aikus.ollama-reachable.v1';
const PROFILE_COLORS = ['#B96042', '#42745C', '#506B9A', '#8B5B88', '#9A783E'] as const;

function settingsKey(profileId: string): string {
  return `aikus.profile.${profileId}.settings`;
}

const profileData = createProfileDataStore(AsyncStorage);

function pinKey(profileId: string): string {
  return `aikus.profile.${profileId}.pin`;
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'en' || value === 'tl';
}

function isAnimationPreference(value: unknown): value is AnimationPreference {
  return value === 'system' || value === 'on' || value === 'off';
}

function getPinCredential(profileId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(pinKey(profileId));
  }
  return import('expo-secure-store').then((secureStore) => secureStore.getItemAsync(pinKey(profileId)));
}

async function setPinCredential(profileId: string, credential: PinCredential): Promise<void> {
  const serialized = JSON.stringify(credential);
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(pinKey(profileId), serialized);
    return;
  }
  const secureStore = await import('expo-secure-store');
  await secureStore.setItemAsync(pinKey(profileId), serialized);
}

async function removePinCredential(profileId: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(pinKey(profileId));
    return;
  }
  const secureStore = await import('expo-secure-store');
  await secureStore.deleteItemAsync(pinKey(profileId));
}

export async function getProfiles(): Promise<LocalProfile[]> {
  const serialized = await AsyncStorage.getItem(PROFILES_KEY);
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is LocalProfile => {
      if (typeof item !== 'object' || item === null) return false;
      const profile = item as Record<string, unknown>;
      return typeof profile.id === 'string'
        && typeof profile.name === 'string'
        && typeof profile.avatarColor === 'string'
        && typeof profile.hasPin === 'boolean'
        && isSupportedLanguage(profile.language)
        && typeof profile.createdAt === 'number';
    });
  } catch {
    return [];
  }
}

async function saveProfiles(profiles: LocalProfile[]): Promise<void> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function getPreferredLanguage(): Promise<SupportedLanguage | null> {
  const current = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (isSupportedLanguage(current)) return current;
  const legacy = await AsyncStorage.getItem(LEGACY_LANGUAGE_KEY);
  if (isSupportedLanguage(legacy)) {
    await AsyncStorage.setItem(LANGUAGE_KEY, legacy);
    return legacy;
  }
  return null;
}

export async function setPreferredLanguage(language: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

export async function getActiveProfileId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
}

export async function setActiveProfileId(profileId: string | null): Promise<void> {
  if (profileId === null) {
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  }
}

export async function createProfile(
  name: string,
  language: SupportedLanguage,
  pin?: string,
): Promise<LocalProfile> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('A profile name is required.');

  const profiles = await getProfiles();
  const id = Crypto.randomUUID();
  const profile: LocalProfile = {
    id,
    name: trimmedName,
    avatarColor: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length],
    hasPin: Boolean(pin),
    language,
    createdAt: Date.now(),
  };

  if (pin) {
    // PINs are hashed with a per-profile salt. This is basic protection, not strong security.
    await setPinCredential(id, await hashPin(pin));
  }

  await saveProfiles([...profiles, profile]);
  await profileData.saveChat(id, []);
  await AsyncStorage.setItem(settingsKey(id), JSON.stringify(defaultProfileSettings(language)));
  return profile;
}

export async function getOrCreateGuestProfile(language: SupportedLanguage): Promise<LocalProfile> {
  const profiles = await getProfiles();
  const guestName = language === 'tl' ? 'Bisita' : 'Guest';
  const existingGuest = profiles.find((profile) => profile.id === 'guest');
  if (existingGuest) {
    const updatedGuest = { ...existingGuest, name: guestName, language };
    await saveProfiles(profiles.map((profile) => profile.id === 'guest' ? updatedGuest : profile));
    await updateProfileSettings(updatedGuest, { language });
    return updatedGuest;
  }

  const guest: LocalProfile = {
    id: 'guest',
    name: guestName,
    avatarColor: PROFILE_COLORS[0],
    hasPin: false,
    language,
    createdAt: Date.now(),
  };
  await saveProfiles([...profiles, guest]);
  await profileData.saveChat(guest.id, []);
  await AsyncStorage.setItem(settingsKey(guest.id), JSON.stringify(defaultProfileSettings(language)));
  return guest;
}

export async function setProfilePin(profileId: string, pin?: string): Promise<void> {
  if (pin) {
    await setPinCredential(profileId, await hashPin(pin));
  } else {
    await removePinCredential(profileId);
  }
  const profiles = await getProfiles();
  await saveProfiles(profiles.map((profile) => profile.id === profileId
    ? { ...profile, hasPin: Boolean(pin) }
    : profile));
}

export async function verifyProfilePin(profileId: string, pin: string): Promise<boolean> {
  const serialized = await getPinCredential(profileId);
  if (!serialized) return false;
  try {
    const credential = JSON.parse(serialized) as PinCredential;
    if (typeof credential.salt !== 'string' || typeof credential.hash !== 'string') return false;
    return verifyPin(pin, credential);
  } catch {
    return false;
  }
}

export async function getProfileSettings(profile: LocalProfile): Promise<ProfileSettings> {
  const serialized = await AsyncStorage.getItem(settingsKey(profile.id));
  if (!serialized) return defaultProfileSettings(profile.language);
  try {
    const settings: Partial<ProfileSettings> = JSON.parse(serialized) as Partial<ProfileSettings>;
    return {
      language: isSupportedLanguage(settings.language) ? settings.language : profile.language,
      textSize: settings.textSize === 'small' || settings.textSize === 'large' ? settings.textSize : 'normal',
      readAloudEnabled: settings.readAloudEnabled === true,
      animationPreference: isAnimationPreference(settings.animationPreference) ? settings.animationPreference : 'system',
    };
  } catch {
    return defaultProfileSettings(profile.language);
  }
}

export function defaultProfileSettings(language: SupportedLanguage): ProfileSettings {
  return { language, textSize: 'normal', readAloudEnabled: false, animationPreference: 'system' };
}

export async function updateProfileSettings(
  profile: LocalProfile,
  changes: Partial<ProfileSettings>,
): Promise<ProfileSettings> {
  const settings = { ...(await getProfileSettings(profile)), ...changes };
  await AsyncStorage.setItem(settingsKey(profile.id), JSON.stringify(settings));
  if (changes.language) {
    const profiles = await getProfiles();
    await saveProfiles(profiles.map((item) => item.id === profile.id
      ? { ...item, language: changes.language! }
      : item));
    await setPreferredLanguage(changes.language);
  }
  return settings;
}

export async function getChatHistory(profileId: string): Promise<ChatMessage[]> {
  const history = await profileData.loadChat(profileId);
  return history.filter((message) => typeof message.id === 'string'
    && (message.role === 'user' || message.role === 'assistant')
    && typeof message.content === 'string'
    && typeof message.createdAt === 'number');
}

export async function saveChatHistory(profileId: string, messages: ChatMessage[]): Promise<void> {
  await profileData.saveChat(profileId, messages);
}

export async function clearChatHistory(profileId: string): Promise<void> {
  await profileData.clearChat(profileId);
}

export async function removeProfile(profileId: string): Promise<void> {
  const profiles = await getProfiles();
  await saveProfiles(profiles.filter((profile) => profile.id !== profileId));
  await Promise.all([profileData.removeChat(profileId), AsyncStorage.removeItem(settingsKey(profileId))]);
  await removePinCredential(profileId);
  if (await getActiveProfileId() === profileId) {
    await setActiveProfileId(null);
  }
}

export async function setOllamaReachable(reachable: boolean): Promise<void> {
  await AsyncStorage.setItem(OLLAMA_REACHABLE_KEY, reachable ? 'true' : 'false');
}

export async function getOllamaReachable(): Promise<boolean | null> {
  const value = await AsyncStorage.getItem(OLLAMA_REACHABLE_KEY);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}
