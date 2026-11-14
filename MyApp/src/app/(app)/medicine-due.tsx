import * as Crypto from 'expo-crypto';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessiblePressable } from '@/components/ui';
import { Mascot } from '@/components/Mascot';
import { canSnooze, formatMedicineTime } from '@/features/medicines/calculations';
import { medicineRepository } from '@/features/medicines/storage';
import { scheduleSnoozeReminder } from '@/features/medicines/notifications';
import { getProfileSettings } from '@/services/profileStore';
import { useAppFlow } from '@/providers/app-flow-provider';
import { colors, fontFamily, profileScreenColors } from '@/theme/tokens';
import type { DoseLog, Medicine } from '@/features/medicines/types';

const COPY = {
  en: {
    label: 'Time for your medicine',
    took: 'I took it',
    snooze: 'Remind me in 10 minutes',
    skip: 'Skip',
    error: 'Could not save your response. Please try again.',
    invalid: 'This reminder is not available.',
    snoozeLimit: 'You have used all three snoozes for this reminder.',
  },
  tl: {
    label: 'Oras na po para sa gamot',
    took: 'Nainom ko na',
    snooze: 'Paalalahanan ako pagkalipas ng 10 minuto',
    skip: 'Laktawan',
    error: 'Hindi na-save ang sagot ninyo. Subukan ulit.',
    invalid: 'Hindi available ang paalalang ito.',
    snoozeLimit: 'Nagamit na ninyo ang tatlong pagpapaliban para sa paalalang ito.',
  },
} as const;

export default function MedicineDueScreen() {
  const params = useLocalSearchParams<{
    profileId?: string;
    medicineId?: string;
    scheduledAt?: string;
    snoozeCount?: string;
  }>();
  const { activeProfile, language } = useAppFlow();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const copy = COPY[language];
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [settingsReadAloud, setSettingsReadAloud] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTaken, setShowTaken] = useState(false);
  const snoozeCount = Number(params.snoozeCount ?? 0);
  const scheduledAt = params.scheduledAt;
  const frameWidth = Math.min(width || 390, 528);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!showTaken) return undefined;
    const navigationTimer = setTimeout(() => router.replace('/(app)/home'), 1500);
    return () => clearTimeout(navigationTimer);
  }, [showTaken]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!activeProfile || params.profileId !== activeProfile.id || !params.medicineId || !scheduledAt || !Number.isFinite(Date.parse(scheduledAt))) {
        router.replace('/(app)/home');
        return;
      }
      const [medicines, doseLogs, settings] = await Promise.all([
        medicineRepository.getMedicines(activeProfile.id),
        medicineRepository.getDoseLogs(activeProfile.id),
        getProfileSettings(activeProfile),
      ]);
      if (!mounted) return;
      setMedicine(medicines.find((item) => item.id === params.medicineId) ?? null);
      setLogs(doseLogs);
      setSettingsReadAloud(settings.readAloudEnabled);
    };
    void load().catch(() => {
      if (mounted) setError(copy.error);
    });
    return () => { mounted = false; };
  }, [activeProfile, copy.error, params.medicineId, params.profileId, scheduledAt]);

  useEffect(() => {
    if (!medicine || !settingsReadAloud) return;
    const phrase = language === 'tl'
      ? `Oras na po para sa gamot: ${medicine.name}.`
      : `Time for your medicine: ${medicine.name}.`;
    Speech.speak(phrase, { language: language === 'tl' ? 'fil-PH' : 'en-US', rate: 0.9 });
    return () => { void Speech.stop(); };
  }, [language, medicine, settingsReadAloud]);

  const record = async (status: 'taken' | 'skipped' | 'snoozed') => {
    if (!activeProfile || !medicine || !scheduledAt || saving) return;
    setSaving(true);
    setError('');
    const log: DoseLog = {
      id: Crypto.randomUUID(),
      medicineId: medicine.id,
      scheduledAt,
      status,
      at: new Date().toISOString(),
    };
    try {
      await medicineRepository.addDoseLog(activeProfile.id, log);
      if (status === 'snoozed') {
        await scheduleSnoozeReminder(activeProfile.id, medicine, scheduledAt, snoozeCount + 1, language);
      }
      if (status === 'taken') setShowTaken(true);
      else router.replace('/(app)/home');
    } catch {
      setError(copy.error);
      setSaving(false);
    }
  };

  if (!medicine) {
    return (
      <View style={styles.screen}>
        <Text accessibilityLiveRegion="polite" style={styles.loading}>{error || copy.invalid}</Text>
      </View>
    );
  }

  const time = scheduledAt ? formatMedicineTime(new Date(scheduledAt), language) : '';
  const canRemindAgain = canSnooze(logs, medicine.id, scheduledAt ?? '');
  const snoozeDisabled = !canRemindAgain || snoozeCount >= 3;
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 32), paddingBottom: Math.max(insets.bottom, 32) + 100 }]}>
        <View style={[styles.card, { width: frameWidth }]}>
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(200)} style={styles.mascot}>
            <Mascot
              pose={showTaken ? 'smile' : 'wave'}
              size={96}
              accessibilityLabel={showTaken
                ? language === 'tl' ? 'Nakangiti si Aik' : 'Aik is smiling'
                : language === 'tl' ? 'Nagpapaalala si Aik' : 'Aik is reminding you'}
            />
          </Animated.View>
          <Text style={styles.label}>{copy.label}</Text>
          <Text accessibilityRole="header" style={styles.medicineName}>{medicine.name}</Text>
          <Text style={styles.time}>{time}</Text>
          {medicine.note ? <Text style={styles.note}>{medicine.note}</Text> : null}
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.took} disabled={saving} onPress={() => void record('taken')} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{copy.took}</Text>
          </AccessiblePressable>
          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={copy.snooze}
            accessibilityHint={snoozeDisabled ? copy.snoozeLimit : undefined}
            accessibilityState={{ disabled: snoozeDisabled || saving }}
            disabled={snoozeDisabled || saving}
            onPress={() => void record('snoozed')}
            style={[styles.secondaryButton, (snoozeDisabled || saving) && styles.disabledButton]}
          >
            <Text style={styles.secondaryText}>{copy.snooze}</Text>
          </AccessiblePressable>
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.skip} disabled={saving} onPress={() => void record('skipped')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{copy.skip}</Text>
          </AccessiblePressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: profileScreenColors.background },
  scrollContent: { width: '100%', flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  card: { maxWidth: 528, alignSelf: 'center', paddingHorizontal: 24, gap: 18, boxSizing: 'border-box' },
  mascot: { alignSelf: 'center' },
  label: { color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  medicineName: { color: profileScreenColors.ink, fontFamily, fontSize: 34, lineHeight: 42, fontWeight: '700' },
  time: { color: profileScreenColors.ink, fontFamily, fontSize: 22, lineHeight: 30 },
  note: { color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 27 },
  error: { color: '#8A2B1F', fontFamily, fontSize: 18, lineHeight: 26 },
  loading: { margin: 24, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26 },
  primaryButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: colors.homeOrange, paddingHorizontal: 20 },
  primaryText: { color: colors.homeOrangeText, fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  secondaryButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: '#F6EDDF', borderWidth: 1, borderColor: '#E2D5C2', paddingHorizontal: 16 },
  secondaryText: { color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
  disabledButton: { opacity: 0.6 },
});
