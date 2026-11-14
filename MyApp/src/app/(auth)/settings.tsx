import { colors } from '@/theme/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { AccessiblePressable as Pressable, LargeTitle, Screen } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { removeProfile } from '@/services/profileStore';

export default function ProfileManagementScreen() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const { profiles, language, refreshProfiles } = useAppFlow();
  const text = FLOW_TEXT[language];
  const [selectedId, setSelectedId] = useState(profileId ?? null);
  const selectedProfile = profiles.find((profile) => profile.id === selectedId) ?? null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteSelected = async () => {
    if (!selectedProfile) return;
    await removeProfile(selectedProfile.id);
    setConfirmDelete(false);
    setSelectedId(null);
    await refreshProfiles();
  };

  return (
    <Screen style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel={text.back} onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ {text.back}</Text>
        </Pressable>
        <LargeTitle style={styles.title}>{text.settings}</LargeTitle>
        <Text style={styles.body}>{profileId ? text.forgotPinMessage : text.manageProfilesPrompt}</Text>
        {profiles.map((profile) => (
          <Pressable key={profile.id} accessibilityRole="radio" accessibilityLabel={profile.name} accessibilityState={{ selected: selectedId === profile.id }} onPress={() => setSelectedId(profile.id)} style={[styles.profileCard, selectedId === profile.id && styles.selectedCard]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{profile.name.charAt(0).toLocaleUpperCase()}</Text></View>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileLanguage}>{profile.language === 'tl' ? 'Tagalog' : 'English'}</Text>
          </Pressable>
        ))}
        {selectedProfile ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${text.deleteProfile}: ${selectedProfile.name}`} onPress={() => setConfirmDelete(true)} style={styles.deleteButton}>
            <Text style={styles.deleteText}>{text.deleteProfile}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <ConfirmDialog
        visible={confirmDelete}
        title={text.deleteProfile}
        message={selectedProfile ? text.deleteProfileConfirm(selectedProfile.name) : ''}
        cancelLabel={text.cancel}
        confirmLabel={text.confirm}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void deleteSelected()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 700, alignSelf: 'center', gap: 14, paddingVertical: 22 },
  backButton: { minHeight: 60, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#F0E3DA' },
  backText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700' },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800' },
  body: { color: colors.secondaryText, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 27 },
  profileCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  selectedCard: { borderColor: colors.primary, backgroundColor: '#F5E9E0' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.card, fontSize: 21,
    fontFamily: 'Inter', fontWeight: '800' },
  profileName: { flex: 1, color: colors.text, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 27, fontWeight: '800' },
  profileLanguage: { color: colors.secondaryText, fontSize: 18, fontFamily: 'Inter' },
  deleteButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: colors.danger, paddingHorizontal: 14, marginTop: 8 },
  deleteText: { color: colors.card, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, fontWeight: '800' },
});
