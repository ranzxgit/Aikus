import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessiblePressable } from '@/components/ui';
import { Mascot } from '@/components/Mascot';
import { useAppFlow } from '@/providers/app-flow-provider';
import { useProfileMedicines } from '@/features/medicines/hooks';
import { getMedicineNotificationPermission, rescheduleMedicineReminders } from '@/features/medicines/notifications';
import { formatMedicineTime } from '@/features/medicines/calculations';
import { medicineRepository } from '@/features/medicines/storage';
import { colors, fontFamily, profileScreenColors } from '@/theme/tokens';
import type { PermissionState } from '@/features/medicines/types';

const COPY = {
  en: {
    back: 'Back',
    title: 'Medicine reminders',
    safety: "Follow your doctor's instructions. Aikus only reminds you of what you entered.",
    empty: "No reminders yet. Add the medicine you take, and I'll remind you.",
    add: 'Add medicine',
    everyday: 'Every day',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    turnOff: (name: string) => `Turn off reminders for ${name}`,
    turnOn: (name: string) => `Turn on reminders for ${name}`,
    permissionDenied: 'Reminders are off. You can allow them in your device settings.',
    openSettings: 'Open settings',
    webNote: 'Reminders work best on your phone.',
    loading: 'Loading reminders...',
    error: 'Could not update reminders. Please try again.',
    loadError: 'Could not load your medicine reminders. Please try again.',
  },
  tl: {
    back: 'Bumalik',
    title: 'Paalala sa gamot',
    safety: 'Sundin ang payo ng inyong doktor. Ang Aikus ay nagpapaalala lang ng inyong inilagay.',
    empty: 'Wala pang paalala. Idagdag ang iniinom ninyong gamot para maalalahanan ko kayo.',
    add: 'Magdagdag ng gamot',
    everyday: 'Araw-araw',
    days: ['Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab', 'Lin'],
    turnOff: (name: string) => `I-off ang mga paalala para sa ${name}`,
    turnOn: (name: string) => `I-on ang mga paalala para sa ${name}`,
    permissionDenied: 'Naka-off ang mga paalala. Maaari ninyo itong payagan sa settings ng device.',
    openSettings: 'Buksan ang settings',
    webNote: 'Pinakamainam gumagana ang mga paalala sa inyong telepono.',
    loading: 'Kinukuha ang mga paalala...',
    error: 'Hindi na-update ang mga paalala. Subukan ulit.',
    loadError: 'Hindi makuha ang mga paalala sa gamot. Subukan ulit.',
  },
} as const;

function formatDays(days: readonly number[], labels: readonly string[], everyDay: string): string {
  if (days.length === 7) return everyDay;
  return [...days].sort((a, b) => a - b).map((day) => labels[day]).join(' · ');
}

export default function MedicineListScreen() {
  const { activeProfile, language } = useAppFlow();
  const copy = COPY[language];
  const { medicines, loading, error, reload } = useProfileMedicines(activeProfile?.id, copy.loadError);
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const frameWidth = Math.min(viewportWidth || 390, 528);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [actionError, setActionError] = useState('');

  useFocusEffect(useCallback(() => {
    let mounted = true;
    const loadPermission = async () => {
      try {
        const result = await getMedicineNotificationPermission();
        if (mounted) setPermission(result);
        if (activeProfile && result === 'granted') await rescheduleMedicineReminders(activeProfile.id, language);
      } catch {
        if (mounted) setActionError(copy.error);
      }
    };
    void loadPermission();
    return () => { mounted = false; };
  }, [activeProfile, copy.error, language]));

  const changeActive = async (medicineId: string, active: boolean) => {
    if (!activeProfile) return;
    setActionError('');
    try {
      await medicineRepository.setMedicineActive(activeProfile.id, medicineId, active);
      await rescheduleMedicineReminders(activeProfile.id, language);
      await reload();
    } catch {
      setActionError(copy.error);
    }
  };

  const openNotificationSettings = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      setActionError(copy.error);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.column, { width: frameWidth }]}>
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={profileScreenColors.ink} accessibilityElementsHidden />
            <Text style={styles.backText}>{copy.back}</Text>
          </AccessiblePressable>
          <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
          <Text style={styles.safety}>{copy.safety}</Text>

          {Platform.OS === 'web' ? <Text style={styles.permissionNote}>{copy.webNote}</Text> : null}
          {permission === 'denied' ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionNote}>{copy.permissionDenied}</Text>
              <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.openSettings} onPress={() => void openNotificationSettings()} style={styles.permissionAction}>
                <Text style={styles.permissionActionText}>{copy.openSettings}</Text>
              </AccessiblePressable>
            </View>
          ) : permission === 'undetermined' && Platform.OS !== 'web' ? (
            <AccessiblePressable accessibilityRole="button" accessibilityLabel={language === 'tl' ? 'Piliin ang mga setting ng paalala' : 'Choose reminder settings'} onPress={() => router.push('/(app)/medicine-permission')} style={styles.permissionAction}>
              <Text style={styles.permissionActionText}>{language === 'tl' ? 'I-set up ang mga paalala' : 'Set up reminders'}</Text>
            </AccessiblePressable>
          ) : null}

          {error || actionError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{actionError || error}</Text> : null}
          {loading ? <Text style={styles.loading}>{copy.loading}</Text> : null}
          {!loading && medicines.length === 0 ? (
            <View style={styles.emptyState}>
              <Mascot pose="think" size={120} accessibilityLabel={language === 'tl' ? 'Nag-iisip si Aik' : 'Aik is thinking'} />
              <Text style={styles.empty}>{copy.empty}</Text>
            </View>
          ) : null}
          <View style={styles.list}>
            {medicines.map((medicine) => (
              <View key={medicine.id} style={styles.row}>
                <AccessiblePressable
                  accessibilityRole="button"
                  accessibilityLabel={medicine.name}
                  onPress={() => router.push({ pathname: '/(app)/medicine-edit', params: { id: medicine.id } })}
                  style={({ pressed }) => [styles.medicineDetail, pressed && styles.rowPressed]}
                >
                  <Text style={styles.medicineName}>{medicine.name}</Text>
                  <Text style={styles.times}>{medicine.times.map((time) => formatMedicineTime(new Date(`2000-01-01T${time}:00`), language)).join(' · ')}</Text>
                  <Text style={styles.days}>{formatDays(medicine.days, copy.days, copy.everyday)}</Text>
                </AccessiblePressable>
                <AccessiblePressable
                  accessibilityRole="switch"
                  accessibilityLabel={medicine.active ? copy.turnOff(medicine.name) : copy.turnOn(medicine.name)}
                  accessibilityState={{ checked: medicine.active }}
                  onPress={() => void changeActive(medicine.id, !medicine.active)}
                  style={styles.switchTarget}
                >
                  <View style={[styles.switchTrack, medicine.active && styles.switchTrackOn]}>
                    <View style={[styles.switchThumb, medicine.active && styles.switchThumbOn]} />
                  </View>
                </AccessiblePressable>
              </View>
            ))}
            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel={copy.add}
              onPress={() => router.push('/(app)/medicine-edit')}
              style={({ pressed }) => [styles.addRow, pressed && styles.rowPressed]}
            >
              <Ionicons name="add" size={28} color={profileScreenColors.ink} accessibilityElementsHidden />
              <Text style={styles.addText}>{copy.add}</Text>
              <Ionicons name="chevron-forward" size={20} color={profileScreenColors.secondaryText} accessibilityElementsHidden />
            </AccessiblePressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: profileScreenColors.background },
  scrollContent: { width: '100%', flexGrow: 1, alignItems: 'center' },
  column: { maxWidth: 528, paddingHorizontal: 24, alignSelf: 'center', boxSizing: 'border-box' },
  back: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 8, borderRadius: 12 },
  backText: { fontFamily, color: profileScreenColors.ink, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  title: { marginTop: 24, color: profileScreenColors.ink, fontFamily, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  safety: { marginTop: 16, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26 },
  permissionBox: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: profileScreenColors.divider },
  permissionNote: { marginTop: 20, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26 },
  permissionAction: { minHeight: 56, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, borderRadius: 12 },
  permissionActionText: { color: colors.accent, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '700', textDecorationLine: 'underline' },
  error: { marginTop: 16, color: '#8A2B1F', fontFamily, fontSize: 18, lineHeight: 26 },
  loading: { marginTop: 24, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26 },
  emptyState: { alignItems: 'center', marginTop: 24, gap: 12 },
  empty: { color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26, textAlign: 'center' },
  list: { marginTop: 20, borderTopWidth: 1, borderTopColor: profileScreenColors.divider },
  row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: profileScreenColors.divider },
  medicineDetail: { flex: 1, minWidth: 0, minHeight: 88, justifyContent: 'center', gap: 2, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  rowPressed: { backgroundColor: profileScreenColors.rowPressed },
  medicineName: { color: profileScreenColors.ink, fontFamily, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  times: { color: profileScreenColors.ink, fontFamily, fontSize: 20, lineHeight: 27 },
  days: { color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 25 },
  switchTarget: { minWidth: 56, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  switchTrack: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 3, backgroundColor: '#D9CEC0' },
  switchTrackOn: { backgroundColor: colors.homeOrange },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  switchThumbOn: { alignSelf: 'flex-end' },
  addRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: profileScreenColors.divider, borderRadius: 8 },
  addText: { flex: 1, color: profileScreenColors.ink, fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '700' },
});
