import { colors } from '@/theme/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AikusAvatar } from '@/components/aikus-avatar';
import { AccessiblePressable as Pressable, IconButton, LargeTitle, ListRow, PrimaryButton, Screen } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { getOrCreateGuestProfile } from '@/services/profileStore';

export default function ProfileSelectScreen() {
  const { profiles, language, activateProfile, changeLanguage } = useAppFlow();
  const { selectedId } = useLocalSearchParams<{ selectedId?: string }>();
  const [selected, setSelected] = useState<string | null>(selectedId ?? null);
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth > 0 && viewportWidth < 300;
  const text = FLOW_TEXT[language];

  const continueToProfile = async () => {
    const profile = profiles.find((item) => item.id === selected);
    if (!profile) return;
    if (profile.hasPin) {
      router.push({ pathname: '/(auth)/pin', params: { profileId: profile.id } });
      return;
    }
    await activateProfile(profile.id);
    router.replace('/(app)/home');
  };

  const continueAsGuest = async () => {
    const guest = await getOrCreateGuestProfile(language);
    await activateProfile(guest.id);
    router.replace('/(app)/home');
  };

  return (
    <Screen style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.topRow, compact && styles.compactTopRow]}>{compact ? null : <View style={styles.gearPlaceholder} />}<View style={[styles.avatarScale, compact && styles.compactAvatar]}><AikusAvatar state="idle" language={language} /></View><IconButton label={text.settings} onPress={() => router.push('/(auth)/settings')} icon={'\u2699'} style={[styles.gear, ...(compact ? [styles.compactGear] : [])]} /></View>
        <LargeTitle style={styles.title}>{language === 'tl' ? 'Sino ang makikipag-usap ngayon?' : 'Who is chatting today?'}</LargeTitle>
        {profiles.length === 0 ? <Text style={styles.body}>{text.noProfiles}</Text> : null}
        <View style={styles.cards}>
          {profiles.map((profile) => (
            <Pressable
              key={profile.id}
              accessibilityRole="radio"
              accessibilityLabel={profile.name}
              accessibilityState={{ selected: selected === profile.id }}
              onPress={() => {
                setSelected(profile.id);
                void changeLanguage(profile.language).catch(() => undefined);
              }}
              style={[styles.profileCard, selected === profile.id && styles.selectedCard]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.name.charAt(0).toLocaleUpperCase()}</Text>
              </View>
              <ListRow style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileLanguage}>{profile.language === 'tl' ? 'Tagalog' : 'English'}</Text>
              </ListRow>
              <Text style={styles.radio}>{selected === profile.id ? '\u2713' : '\u203A'}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel={text.addProfile} onPress={() => router.push('/(auth)/add-profile')} style={styles.addCard}>
            <Text style={styles.addMark}>＋</Text>
            <Text style={styles.addText}>{text.addProfile}</Text>
          </Pressable>
        </View>
        {selected !== null ? <PrimaryButton label={text.continue} onPress={() => void continueToProfile()} style={styles.continueButton}><Text style={styles.continueText}>{text.continue}</Text></PrimaryButton> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={text.guest} onPress={() => void continueAsGuest()} style={styles.guestButton}>
          <Text style={styles.settingsText}>{text.guest}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', gap: 18, paddingVertical: 22 },
  topRow: { minHeight: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compactTopRow: { minHeight: 156, justifyContent: 'center' },
  avatarScale: { transform: [{ scale: 1.125 }] },
  gearPlaceholder: { width: 60 },
  gear: { backgroundColor: colors.card },
  compactAvatar: { marginTop: 56 },
  compactGear: { position: 'absolute', right: 0, top: 0 },
  brand: { color: colors.text, fontSize: 20,
    fontFamily: 'Inter', fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.secondaryText, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, textAlign: 'center' },
  cards: { gap: 12 },
  profileCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  selectedCard: { borderColor: colors.primary, backgroundColor: '#F5E9E0' },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.card, fontSize: 24,
    fontFamily: 'Inter', fontWeight: '800' },
  profileInfo: { flex: 1, minHeight: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 3 },
  profileName: { color: colors.text, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 27, fontWeight: '800' },
  profileLanguage: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 24 },
  radio: { color: colors.primary, fontSize: 24,
    fontFamily: 'Inter', paddingHorizontal: 6 },
  addCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  addMark: { color: colors.primary, fontSize: 30,
    fontFamily: 'Inter', lineHeight: 36 },
  addText: { color: colors.text, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '700' },
  continueButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: colors.primary, marginTop: 8 },
  disabledButton: { backgroundColor: colors.secondaryText },
  continueText: { color: colors.card, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '800' },
  settingsButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center' },
  guestButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, borderWidth: 2, borderColor: colors.secondaryText, backgroundColor: colors.card },
  settingsText: { color: colors.accent, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700', textDecorationLine: 'underline' },
});
