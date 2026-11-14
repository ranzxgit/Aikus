import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessiblePressable } from '@/components/ui';
import { requestMedicineNotificationPermission, rescheduleMedicineReminders } from '@/features/medicines/notifications';
import { useAppFlow } from '@/providers/app-flow-provider';
import { colors, fontFamily, profileScreenColors } from '@/theme/tokens';

const COPY = {
  en: {
    back: 'Back',
    title: 'Allow medicine reminders?',
    explanation: 'Aikus needs to send reminders at the times you choose.',
    safety: "Follow your doctor's instructions. Aikus only reminds you of what you entered.",
    allow: 'Allow reminders',
    notNow: 'Not now',
    web: 'Reminders work best on your phone. While this page is open, Aikus checks for reminders every 30 seconds.',
    error: 'Could not set up reminders. Please try again.',
  },
  tl: {
    back: 'Bumalik',
    title: 'Payagan ang mga paalala sa gamot?',
    explanation: 'Kailangang magpadala si Aikus ng mga paalala sa mga oras na pinili ninyo.',
    safety: 'Sundin ang payo ng inyong doktor. Ang Aikus ay nagpapaalala lang ng inyong inilagay.',
    allow: 'Payagan ang mga paalala',
    notNow: 'Huwag muna',
    web: 'Pinakamainam gumagana ang mga paalala sa inyong telepono. Habang bukas ang pahinang ito, titingin si Aikus kada 30 segundo.',
    error: 'Hindi na-set up ang mga paalala. Subukan ulit.',
  },
} as const;

export default function MedicinePermissionScreen() {
  const { activeProfile, language } = useAppFlow();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const copy = COPY[language];
  const [error, setError] = useState('');
  const frameWidth = Math.min(width || 390, 528);

  const allow = async () => {
    if (!activeProfile) return;
    setError('');
    try {
      const permission = await requestMedicineNotificationPermission();
      if (permission === 'granted') await rescheduleMedicineReminders(activeProfile.id, language);
      router.back();
    } catch {
      setError(copy.error);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) + 100 }]}>
        <View style={[styles.column, { width: frameWidth }]}>
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← {copy.back}</Text>
          </AccessiblePressable>
          <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.explanation}</Text>
          <Text style={styles.body}>{copy.safety}</Text>
          {Platform.OS === 'web' ? <Text style={styles.body}>{copy.web}</Text> : null}
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.allow} onPress={() => void allow()} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{copy.allow}</Text>
          </AccessiblePressable>
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.notNow} onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{copy.notNow}</Text>
          </AccessiblePressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: profileScreenColors.background },
  scrollContent: { width: '100%', flexGrow: 1, alignItems: 'center' },
  column: { maxWidth: 528, paddingHorizontal: 24, alignSelf: 'center', boxSizing: 'border-box' },
  back: { minHeight: 56, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 },
  backText: { fontFamily, color: profileScreenColors.ink, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  title: { marginTop: 32, color: profileScreenColors.ink, fontFamily, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  body: { marginTop: 16, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 27 },
  error: { marginTop: 16, color: '#8A2B1F', fontFamily, fontSize: 18, lineHeight: 26 },
  primaryButton: { minHeight: 60, marginTop: 32, borderRadius: 999, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.homeOrange, paddingHorizontal: 20 },
  primaryText: { color: colors.homeOrangeText, fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  secondaryButton: { minHeight: 56, marginTop: 8, borderRadius: 999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  secondaryText: { color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '600' },
});
