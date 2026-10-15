import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { SupportedLanguage } from '@/config';
import {
  getActiveProfileId,
  getPreferredLanguage,
  getProfiles,
  setActiveProfileId,
  setPreferredLanguage,
} from '@/services/profileStore';
import type { LocalProfile } from '@/types/profile';

interface AppFlowContextValue {
  isReady: boolean;
  profiles: LocalProfile[];
  activeProfile: LocalProfile | null;
  language: SupportedLanguage;
  hasChosenLanguage: boolean;
  ollamaReachable: boolean | null;
  refreshProfiles: () => Promise<void>;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  activateProfile: (profileId: string) => Promise<void>;
  logOut: () => Promise<void>;
  setOllamaStatus: (reachable: boolean) => void;
}

const AppFlowContext = createContext<AppFlowContextValue | null>(null);

export function AppFlowProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [hasChosenLanguage, setHasChosenLanguage] = useState(false);
  const [ollamaReachable, setOllamaReachable] = useState<boolean | null>(null);

  const refreshProfiles = useCallback(async () => {
    const [savedProfiles, activeId, preferredLanguage] = await Promise.all([
      getProfiles(),
      getActiveProfileId(),
      getPreferredLanguage(),
    ]);
    const activeProfile = savedProfiles.find((profile) => profile.id === activeId) ?? null;
    setProfiles(savedProfiles);
    setActiveId(activeProfile?.id ?? null);
    setLanguage(activeProfile?.language ?? preferredLanguage ?? 'en');
    setHasChosenLanguage(preferredLanguage !== null || activeProfile !== null);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getProfiles(), getActiveProfileId(), getPreferredLanguage()])
      .then(([savedProfiles, savedActiveId, preferredLanguage]) => {
        if (!active) return;
        const activeProfile = savedProfiles.find((profile) => profile.id === savedActiveId) ?? null;
        setProfiles(savedProfiles);
        setActiveId(activeProfile?.id ?? null);
        setLanguage(activeProfile?.language ?? preferredLanguage ?? 'en');
        setHasChosenLanguage(preferredLanguage !== null || activeProfile !== null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const changeLanguage = useCallback(async (nextLanguage: SupportedLanguage) => {
    await setPreferredLanguage(nextLanguage);
    setHasChosenLanguage(true);
    if (activeProfileId) {
      const current = profiles.find((profile) => profile.id === activeProfileId);
      if (current) {
        const { updateProfileSettings } = await import('@/services/profileStore');
        await updateProfileSettings(current, { language: nextLanguage });
      }
    }
    setLanguage(nextLanguage);
    await refreshProfiles();
  }, [activeProfileId, profiles, refreshProfiles]);

  const activateProfile = useCallback(async (profileId: string) => {
    await setActiveProfileId(profileId);
    await refreshProfiles();
  }, [refreshProfiles]);

  const logOut = useCallback(async () => {
    await setActiveProfileId(null);
    setActiveId(null);
    await refreshProfiles();
  }, [refreshProfiles]);

  const value = useMemo<AppFlowContextValue>(() => ({
    isReady,
    profiles,
    activeProfile: profiles.find((profile) => profile.id === activeProfileId) ?? null,
    language,
    hasChosenLanguage,
    ollamaReachable,
    refreshProfiles,
    changeLanguage,
    activateProfile,
    logOut,
    setOllamaStatus: setOllamaReachable,
  }), [isReady, profiles, activeProfileId, language, hasChosenLanguage, ollamaReachable, refreshProfiles, changeLanguage, activateProfile, logOut]);

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>;
}

export function useAppFlow(): AppFlowContextValue {
  const value = useContext(AppFlowContext);
  if (!value) throw new Error('useAppFlow must be used inside AppFlowProvider.');
  return value;
}
