import { colors } from '@/theme/tokens';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { AccessiblePressable as Pressable, LargeTitle, Screen } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { clearChatHistory, getProfileSettings, removeProfile, setProfilePin, updateProfileSettings } from '@/services/profileStore';
import type { AnimationPreference, ProfileSettings, TextSize } from '@/types/profile';

type PendingConfirmation = 'clear' | 'delete' | null;

export default function SettingsScreen() {
  const { activeProfile, language, changeLanguage, logOut, refreshProfiles } = useAppFlow();
  const text = FLOW_TEXT[language];
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [newPin, setNewPin] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);

  useEffect(() => {
    if (!activeProfile) {
      router.replace('/(auth)/login');
      return;
    }
    let mounted = true;
    getProfileSettings(activeProfile).then((loaded) => {
      if (mounted) setSettings(loaded);
    });
    return () => { mounted = false; };
  }, [activeProfile]);

  if (!activeProfile || !settings) {
    return <Screen style={styles.safeArea}><View style={styles.loading}><Text style={styles.loadingText}>{text.settings}</Text></View></Screen>;
  }

  const update = async (changes: Partial<ProfileSettings>) => {
    const next = await updateProfileSettings(activeProfile, changes);
    setSettings(next);
    if (changes.language) await changeLanguage(changes.language);
  };

  const savePin = async () => {
    if (newPin.length !== 0 && !/^\d{4}$/.test(newPin)) {
      setNotice(language === 'tl' ? 'Gumamit ng eksaktong 4 na digit.' : 'Use exactly 4 digits.');
      return;
    }
    await setProfilePin(activeProfile.id, newPin || undefined);
    await refreshProfiles();
    setNewPin('');
    setNotice(text.saved);
  };

  const confirm = async () => {
    if (pendingConfirmation === 'clear') {
      await clearChatHistory(activeProfile.id);
      setNotice(text.saved);
    } else if (pendingConfirmation === 'delete') {
      await removeProfile(activeProfile.id);
      await logOut();
      await refreshProfiles();
      router.replace('/(auth)/login');
    }
    setPendingConfirmation(null);
  };

  const logout = async () => {
    await logOut();
    router.replace('/(auth)/login');
  };

  const selectedLabels: Record<TextSize, string> = {
    small: text.small,
    normal: text.normal,
    large: text.large,
  };
  const animationLabels: Record<AnimationPreference, string> = {
    on: text.animationsOn,
    off: text.animationsOff,
    system: text.animationsSystem,
  };

  return (
    <Screen style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel={text.back} onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ {text.back}</Text>
        </Pressable>
        <LargeTitle style={styles.title}>{text.settings}</LargeTitle>
        <Text style={styles.profileName}>{activeProfile.name}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>{text.language}</Text>
          <View style={styles.choiceRow}>
            {(['en', 'tl'] as const).map((option) => (
              <Pressable key={option} accessibilityRole="button" accessibilityLabel={option === 'en' ? 'English' : 'Tagalog'} accessibilityState={{ selected: settings.language === option }} onPress={() => void update({ language: option })} style={[styles.choice, settings.language === option && styles.choiceActive]}>
                <Text style={[styles.choiceText, settings.language === option && styles.choiceTextActive]}>{option === 'en' ? 'English' : 'Tagalog'}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{text.textSize}</Text>
          <View style={styles.choiceRow}>
            {(['small', 'normal', 'large'] as const).map((size) => (
              <Pressable key={size} accessibilityRole="button" accessibilityLabel={selectedLabels[size]} accessibilityState={{ selected: settings.textSize === size }} onPress={() => void update({ textSize: size })} style={[styles.choice, settings.textSize === size && styles.choiceActive]}>
                <Text style={[styles.choiceText, settings.textSize === size && styles.choiceTextActive]}>{selectedLabels[size]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{text.animations}</Text>
          <View style={styles.choiceRow}>
            {(['on', 'off', 'system'] as const).map((preference) => (
              <Pressable
                key={preference}
                accessibilityRole="radio"
                accessibilityLabel={`${text.animations}: ${animationLabels[preference]}`}
                accessibilityState={{ selected: settings.animationPreference === preference }}
                onPress={() => void update({ animationPreference: preference })}
                style={[styles.choice, settings.animationPreference === preference && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, settings.animationPreference === preference && styles.choiceTextActive]}>
                  {animationLabels[preference]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>{text.readAloud}</Text>
          <Switch accessibilityRole="switch" accessibilityLabel={text.readAloud} value={settings.readAloudEnabled} onValueChange={(value) => void update({ readAloudEnabled: value })} trackColor={{ false: '#A9A29D', true: colors.accent }} thumbColor="#FFFFFF" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{text.changePin}</Text>
          <TextInput accessibilityLabel={text.newPin} placeholder={text.newPin} placeholderTextColor="#615148" value={newPin} onChangeText={(value) => setNewPin(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} style={styles.input} />
          <Pressable accessibilityRole="button" accessibilityLabel={text.changePin} onPress={() => void savePin()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{text.changePin}</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel={text.clearHistory} onPress={() => setPendingConfirmation('clear')} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>{text.clearHistory}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={text.deleteProfile} onPress={() => setPendingConfirmation('delete')} style={styles.deleteButton}>
          <Text style={styles.deleteText}>{text.deleteProfile}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={text.logOut} onPress={() => void logout()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>{text.logOut}</Text>
        </Pressable>
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      </ScrollView>

      <ConfirmDialog
        visible={pendingConfirmation !== null}
        title={pendingConfirmation === 'delete' ? text.deleteProfile : text.clearHistory}
        message={pendingConfirmation === 'delete' ? text.deleteProfileConfirm(activeProfile.name) : text.clearHistoryConfirm}
        cancelLabel={text.cancel}
        confirmLabel={text.confirm}
        destructive
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={() => void confirm()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 700, alignSelf: 'center', gap: 16, paddingVertical: 22 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.text, fontSize: 20, fontFamily: 'Inter' },
  backButton: { minHeight: 60, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#F0E3DA' },
  backText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700' },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800' },
  profileName: { color: colors.secondaryText, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '700' },
  section: { gap: 10, paddingTop: 8 },
  label: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, fontWeight: '700' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 60, minWidth: 96, flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderWidth: 2, borderColor: colors.secondaryText, borderRadius: 999, backgroundColor: colors.card },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 25, fontWeight: '700' },
  choiceTextActive: { color: colors.card },
  switchRow: { minHeight: 62, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#C9BDB5', paddingVertical: 6 },
  input: { minHeight: 60, borderWidth: 2, borderColor: colors.secondaryText, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 14, color: colors.text, fontSize: 20, fontFamily: 'Inter' },
  secondaryButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.card, paddingHorizontal: 14 },
  secondaryText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  deleteButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: colors.danger, paddingHorizontal: 14 },
  deleteText: { color: colors.card, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, fontWeight: '800' },
  notice: { color: colors.accent, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26 },
});
