import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessiblePressable } from '@/components/ui';
import { useAppFlow } from '@/providers/app-flow-provider';
import { profileScreenColors, fontFamily } from '@/theme/tokens';

export default function ProfileSelectScreen() {
  const { profiles, language, activateProfile, changeLanguage } = useAppFlow();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth > 0 && viewportWidth < 300;
  const [openingProfile, setOpeningProfile] = useState(false);
  const isTagalog = language === 'tl';
  const copy = isTagalog
    ? {
        settings: 'Settings',
        title: 'Sino ang makikipag-chat ngayon?',
        subtitle: 'Piliin ang pangalan ninyo para magsimula.',
        emptySubtitle: 'Magdagdag ng profile para magsimula.',
        addProfile: 'Magdagdag ng profile',
        note: 'Nananatili sa profile ninyo ang inyong mga usapan.',
      }
    : {
        settings: 'Settings',
        title: 'Who is chatting today?',
        subtitle: 'Choose your name to begin.',
        emptySubtitle: 'Add a profile to begin.',
        addProfile: 'Add profile',
        note: 'Your conversations stay with your profile.',
      };

  const openProfile = async (profile: (typeof profiles)[number]) => {
    if (openingProfile) return;
    setOpeningProfile(true);
    try {
      await changeLanguage(profile.language);
      if (profile.hasPin) {
        router.push({ pathname: '/(auth)/pin', params: { profileId: profile.id } });
        return;
      }
      await activateProfile(profile.id);
      router.replace('/(app)/home');
    } finally {
      setOpeningProfile(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.frame, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <View style={styles.topRow}>
              <View style={styles.topSpacer} />
              <AccessiblePressable
                accessibilityRole="button"
                accessibilityLabel={copy.settings}
                onPress={() => router.push('/(auth)/settings')}
                style={({ pressed }) => [styles.settingsButton, pressed && styles.rowPressed]}
              >
                <Ionicons name="settings-outline" size={22} color={profileScreenColors.ink} accessibilityElementsHidden />
                <Text style={styles.settingsText}>{copy.settings}</Text>
              </AccessiblePressable>
            </View>

            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
              <Text style={styles.subtitle}>{profiles.length === 0 ? copy.emptySubtitle : copy.subtitle}</Text>
            </View>

            <View style={styles.profileList}>
              {profiles.map((profile) => (
                <AccessiblePressable
                  key={profile.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${profile.name}, ${isTagalog ? 'magbubukas ng usapan' : 'opens chat'}`}
                  disabled={openingProfile}
                  onPress={() => void openProfile(profile)}
                  style={({ pressed }) => [styles.profileRow, compact && styles.compactProfileRow, pressed && styles.rowPressed]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>{profile.name.charAt(0).toLocaleUpperCase()}</Text>
                  </View>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  <Ionicons name="chevron-forward" size={compact ? 16 : 20} color={profileScreenColors.secondaryText} accessibilityElementsHidden />
                </AccessiblePressable>
              ))}

              <AccessiblePressable
                accessibilityRole="button"
                accessibilityLabel={copy.addProfile}
                onPress={() => router.push('/(auth)/add-profile')}
                style={({ pressed }) => [styles.profileRow, compact && styles.compactProfileRow, pressed && styles.rowPressed]}
              >
                <View style={styles.addIcon}>
                  <Ionicons name="add" size={28} color={profileScreenColors.ink} accessibilityElementsHidden />
                </View>
                <Text style={styles.addText}>{copy.addProfile}</Text>
                <Ionicons name="chevron-forward" size={compact ? 16 : 20} color={profileScreenColors.secondaryText} accessibilityElementsHidden />
              </AccessiblePressable>
            </View>
          </View>

          <Text style={styles.note}>{copy.note}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: profileScreenColors.background },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between', paddingBottom: 24 },
  topRow: { height: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topSpacer: { flex: 1 },
  settingsButton: { minWidth: 56, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 8 },
  settingsText: { color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  heading: { marginTop: 40 },
  title: { color: profileScreenColors.ink, fontFamily, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  subtitle: { marginTop: 12, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26 },
  profileList: { marginTop: 32 },
  profileRow: { width: '100%', minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: profileScreenColors.divider, paddingHorizontal: 8, borderRadius: 8 },
  compactProfileRow: { gap: 8, paddingHorizontal: 4 },
  rowPressed: { backgroundColor: profileScreenColors.rowPressed },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: profileScreenColors.avatar },
  avatarInitial: { color: profileScreenColors.ink, fontFamily, fontSize: 22, lineHeight: 27, fontWeight: '700' },
  profileName: { flex: 1, color: profileScreenColors.ink, fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  addIcon: { width: 28, height: 48, alignItems: 'flex-start', justifyContent: 'center' },
  addText: { flex: 1, color: profileScreenColors.ink, fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  note: { marginTop: 24, color: profileScreenColors.secondaryText, fontFamily, fontSize: 16, lineHeight: 21 },
});
