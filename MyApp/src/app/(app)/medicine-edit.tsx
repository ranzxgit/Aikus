import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { AccessiblePressable } from '@/components/ui';
import { medicineRepository } from '@/features/medicines/storage';
import { validateMedicineInput } from '@/features/medicines/validation';
import { rescheduleMedicineReminders } from '@/features/medicines/notifications';
import { formatMedicineTime } from '@/features/medicines/calculations';
import { useAppFlow } from '@/providers/app-flow-provider';
import { colors, fontFamily, profileScreenColors } from '@/theme/tokens';
import type { MedicineField, MedicineValidationErrors } from '@/features/medicines/validation';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const COPY = {
  en: {
    back: 'Back',
    add: 'Add medicine',
    edit: 'Edit medicine',
    safety: "Follow your doctor's instructions. Aikus only reminds you of what you entered.",
    name: 'Medicine name',
    note: 'Note (optional)',
    noteHint: 'for example, after meals',
    time: 'Time',
    addTime: '+ Add another time',
    days: 'Days',
    everyDay: 'Every day',
    dayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    save: 'Save',
    delete: 'Delete this medicine',
    deleteTitle: 'Delete medicine?',
    deleteMessage: (name: string) => `Delete ${name}? Its future reminders will be removed. Dose history will stay.`,
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    leaveTitle: 'Leave without saving?',
    leaveMessage: 'Your changes will be lost.',
    stay: 'Keep editing',
    leave: 'Leave',
    errorTitle: 'Could not save',
    errorMessage: 'Please check your details and try again.',
    emptyName: 'Enter a medicine name.',
    tooLongName: 'Use 40 characters or fewer.',
    tooLongNote: 'Use 80 characters or fewer.',
    atLeastOneTime: 'Add at least one time.',
    tooManyTimes: 'Choose up to six times.',
    invalidTime: 'Choose a valid time.',
    duplicateTime: 'Each time must be different.',
    atLeastOneDay: 'Choose at least one day.',
    invalidDays: 'Choose valid days.',
    duplicateDays: 'Each day can be chosen once.',
    invalidActive: 'Choose whether reminders are on.',
    invalidNote: 'Enter a text note.',
    hourUp: 'Increase hour',
    hourDown: 'Decrease hour',
    minuteUp: 'Increase minutes',
    minuteDown: 'Decrease minutes',
    ampm: 'Choose AM or PM',
    done: 'Done',
    timePicker: 'Choose a time',
    close: 'Close time picker',
    removeTime: (time: string) => `Remove ${time}`,
    error: 'Could not save your medicine. Please try again.',
  },
  tl: {
    back: 'Bumalik',
    add: 'Magdagdag ng gamot',
    edit: 'I-edit ang gamot',
    safety: 'Sundin ang payo ng inyong doktor. Ang Aikus ay nagpapaalala lang ng inyong inilagay.',
    name: 'Pangalan ng gamot',
    note: 'Tala (opsyonal)',
    noteHint: 'halimbawa, pagkatapos kumain',
    time: 'Oras',
    addTime: '+ Magdagdag ng oras',
    days: 'Mga araw',
    everyDay: 'Araw-araw',
    dayNames: ['Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab', 'Lin'],
    save: 'I-save',
    delete: 'Burahin ang gamot na ito',
    deleteTitle: 'Burahin ang gamot?',
    deleteMessage: (name: string) => `Burahin ang ${name}? Aalisin ang mga susunod na paalala. Mananatili ang tala ng pag-inom.`,
    cancel: 'Huwag muna',
    confirmDelete: 'Burahin',
    leaveTitle: 'Umalis nang hindi sine-save?',
    leaveMessage: 'Mawawala ang mga pagbabago ninyo.',
    stay: 'Magpatuloy sa pag-edit',
    leave: 'Umalis',
    errorTitle: 'Hindi na-save',
    errorMessage: 'Suriin ang mga detalye at subukan ulit.',
    emptyName: 'Ilagay ang pangalan ng gamot.',
    tooLongName: 'Gumamit ng hanggang 40 na character.',
    tooLongNote: 'Gumamit ng hanggang 80 na character.',
    atLeastOneTime: 'Magdagdag ng kahit isang oras.',
    tooManyTimes: 'Pumili ng hanggang anim na oras.',
    invalidTime: 'Pumili ng tamang oras.',
    duplicateTime: 'Magkakaiba dapat ang mga oras.',
    atLeastOneDay: 'Pumili ng kahit isang araw.',
    invalidDays: 'Pumili ng tamang mga araw.',
    duplicateDays: 'Piliin lang nang isang beses ang bawat araw.',
    invalidActive: 'Piliin kung naka-on ang mga paalala.',
    invalidNote: 'Maglagay ng text na tala.',
    hourUp: 'Dagdagan ang oras',
    hourDown: 'Bawasan ang oras',
    minuteUp: 'Dagdagan ang minuto',
    minuteDown: 'Bawasan ang minuto',
    ampm: 'Pumili ng AM o PM',
    done: 'Tapos na',
    timePicker: 'Pumili ng oras',
    close: 'Isara ang pagpili ng oras',
    removeTime: (time: string) => `Alisin ang ${time}`,
    error: 'Hindi na-save ang gamot. Subukan ulit.',
  },
} as const;

type Dialog = 'leave' | 'delete' | null;

function localizeFieldErrors(errors: MedicineValidationErrors, language: 'en' | 'tl'): MedicineValidationErrors {
  const text = COPY[language];
  const messages: Record<MedicineField, Record<string, string>> = {
    name: { 'Enter a medicine name.': text.emptyName, 'Use 40 characters or fewer.': text.tooLongName },
    note: { 'Use 80 characters or fewer.': text.tooLongNote, 'Enter a text note.': text.invalidNote },
    times: {
      'Add at least one time.': text.atLeastOneTime,
      'Choose up to six times.': text.tooManyTimes,
      'Choose a valid time.': text.invalidTime,
      'Each time must be different.': text.duplicateTime,
    },
    days: {
      'Choose at least one day.': text.atLeastOneDay,
      'Choose valid days.': text.invalidDays,
      'Each day can be chosen once.': text.duplicateDays,
    },
    active: { 'Choose whether reminders are on.': text.invalidActive },
  };
  return Object.fromEntries(Object.entries(errors).map(([field, message]) => [
    field,
    (messages[field as MedicineField] ?? {})[message ?? ''] ?? message,
  ]));
}

export default function MedicineEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { activeProfile, language } = useAppFlow();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const copy = COPY[language];
  const frameWidth = Math.min(width || 390, 528);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [days, setDays] = useState<number[]>([...DAYS]);
  const [active, setActive] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [initialValue, setInitialValue] = useState('');
  const [fieldErrors, setFieldErrors] = useState<MedicineValidationErrors>({});
  const [formError, setFormError] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [isPm, setIsPm] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoaded(false);
      if (!activeProfile) {
        router.replace('/(auth)/login');
        return;
      }
      const medicine = id ? (await medicineRepository.getMedicines(activeProfile.id)).find((item) => item.id === id) : undefined;
      if (id && !medicine) {
        router.replace('/(app)/medicines');
        return;
      }
      if (!mounted) return;
      const initial = medicine
        ? { name: medicine.name, note: medicine.note ?? '', times: medicine.times, days: medicine.days, active: medicine.active }
        : { name: '', note: '', times: [] as string[], days: [...DAYS], active: true };
      setName(initial.name);
      setNote(initial.note);
      setTimes([...initial.times]);
      setDays([...initial.days]);
      setActive(initial.active);
      setInitialValue(JSON.stringify(initial));
      setLoaded(true);
    };
    void load().catch(() => {
      if (mounted) {
        setFormError(copy.error);
        setLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, [activeProfile, copy.error, id]);

  const currentValue = JSON.stringify({ name, note, times, days, active });
  const dirty = loaded && currentValue !== initialValue;
  const input = useMemo(() => ({ name, note, times, days, active }), [active, days, name, note, times]);

  const goBack = () => {
    if (dirty) setDialog('leave');
    else router.back();
  };

  const save = async () => {
    if (!activeProfile) return;
    const errors = localizeFieldErrors(validateMedicineInput(input), language);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length) return;
    try {
      await medicineRepository.upsertMedicine(activeProfile.id, input, id);
      await rescheduleMedicineReminders(activeProfile.id, language);
      router.replace('/(app)/medicines');
    } catch {
      setFormError(copy.error);
    }
  };

  const deleteMedicine = async () => {
    if (!activeProfile || !id) return;
    try {
      await medicineRepository.deleteMedicine(activeProfile.id, id);
      await rescheduleMedicineReminders(activeProfile.id, language);
      setDialog(null);
      router.replace('/(app)/medicines');
    } catch {
      setDialog(null);
      setFormError(copy.error);
    }
  };

  const addTime = () => {
    if (times.length >= 6) {
      setFieldErrors((current) => ({ ...current, times: copy.tooManyTimes }));
      return;
    }
    const hour24 = hour % 12 + (isPm ? 12 : 0);
    const value = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (times.includes(value)) {
      setFieldErrors((current) => ({ ...current, times: copy.duplicateTime }));
      return;
    }
    setTimes((current) => [...current, value].sort());
    setFieldErrors((current) => ({ ...current, times: undefined }));
    setTimePickerOpen(false);
  };

  const title = id ? copy.edit : copy.add;

  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) + 110 }]}
      >
        <View style={[styles.column, { width: frameWidth }]}>
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={goBack} style={styles.back}>
            <Text style={styles.backText}>← {copy.back}</Text>
          </AccessiblePressable>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.safety}>{copy.safety}</Text>

          <Text style={styles.label}>{copy.name}</Text>
          <TextInput
            accessibilityLabel={copy.name}
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            style={styles.input}
          />
          {fieldErrors.name ? <Text style={styles.error}>{fieldErrors.name}</Text> : null}

          <Text style={styles.label}>{copy.note}</Text>
          <TextInput
            accessibilityLabel={copy.note}
            value={note}
            onChangeText={setNote}
            placeholder={copy.noteHint}
            maxLength={80}
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            style={styles.input}
          />
          {fieldErrors.note ? <Text style={styles.error}>{fieldErrors.note}</Text> : null}

          <Text style={styles.label}>{copy.time}</Text>
          <View style={styles.chipWrap}>
            {times.map((time) => {
              const label = formatMedicineTime(new Date(`2000-01-01T${time}:00`), language);
              return (
                <AccessiblePressable key={time} accessibilityRole="button" accessibilityLabel={copy.removeTime(label)} onPress={() => setTimes((current) => current.filter((item) => item !== time))} style={styles.timeChip}>
                  <Text style={styles.timeChipText}>{label}  ×</Text>
                </AccessiblePressable>
              );
            })}
          </View>
          {fieldErrors.times ? <Text style={styles.error}>{fieldErrors.times}</Text> : null}
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.addTime} onPress={() => setTimePickerOpen(true)} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{copy.addTime}</Text>
          </AccessiblePressable>

          <Text style={styles.label}>{copy.days}</Text>
          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={copy.everyDay}
            accessibilityState={{ selected: days.length === 7 }}
            onPress={() => setDays(days.length === 7 ? [] : [...DAYS])}
            style={[styles.dayChip, styles.everyDayChip, days.length === 7 && styles.daySelected]}
          >
            <Text style={[styles.dayText, days.length === 7 && styles.dayTextSelected]}>{days.length === 7 ? '✓  ' : ''}{copy.everyDay}</Text>
          </AccessiblePressable>
          <View style={styles.chipWrap}>
            {DAYS.map((day) => {
              const selected = days.includes(day);
              const label = copy.dayNames[day];
              return (
                <AccessiblePressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b))}
                  style={[styles.dayChip, selected && styles.daySelected]}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{selected ? '✓ ' : ''}{label}</Text>
                </AccessiblePressable>
              );
            })}
          </View>
          {fieldErrors.days ? <Text style={styles.error}>{fieldErrors.days}</Text> : null}

          {formError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{formError}</Text> : null}
          <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.save} onPress={() => void save()} style={styles.saveButton}>
            <Text style={styles.saveText}>{copy.save}</Text>
          </AccessiblePressable>
          {id ? (
            <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.delete} onPress={() => setDialog('delete')} style={styles.deleteButton}>
              <Text style={styles.deleteText}>{copy.delete}</Text>
            </AccessiblePressable>
          ) : null}
        </View>
      </ScrollView>

      <Modal transparent visible={timePickerOpen} animationType="fade" onRequestClose={() => setTimePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.timePicker}>
            <Text accessibilityRole="header" style={styles.pickerTitle}>{copy.timePicker}</Text>
            <View style={styles.stepperRow}>
              <View style={styles.stepper}>
                <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.hourUp} onPress={() => setHour((current) => current === 12 ? 1 : current + 1)} style={styles.stepButton}><Text style={styles.stepButtonText}>+</Text></AccessiblePressable>
                <Text accessibilityLiveRegion="polite" style={styles.stepValue}>{hour}</Text>
                <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.hourDown} onPress={() => setHour((current) => current === 1 ? 12 : current - 1)} style={styles.stepButton}><Text style={styles.stepButtonText}>−</Text></AccessiblePressable>
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.stepper}>
                <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.minuteUp} onPress={() => setMinute((current) => (current + 5) % 60)} style={styles.stepButton}><Text style={styles.stepButtonText}>+</Text></AccessiblePressable>
                <Text accessibilityLiveRegion="polite" style={styles.stepValue}>{String(minute).padStart(2, '0')}</Text>
                <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.minuteDown} onPress={() => setMinute((current) => (current + 55) % 60)} style={styles.stepButton}><Text style={styles.stepButtonText}>−</Text></AccessiblePressable>
              </View>
              <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.ampm} onPress={() => setIsPm((current) => !current)} style={styles.ampmButton}>
                <Text style={styles.ampmText}>{isPm ? 'PM' : 'AM'}</Text>
              </AccessiblePressable>
            </View>
            <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.done} onPress={addTime} style={styles.saveButton}>
              <Text style={styles.saveText}>{copy.done}</Text>
            </AccessiblePressable>
            <AccessiblePressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={() => setTimePickerOpen(false)} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{copy.close}</Text>
            </AccessiblePressable>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={dialog !== null}
        title={dialog === 'delete' ? copy.deleteTitle : copy.leaveTitle}
        message={dialog === 'delete' ? copy.deleteMessage(name.trim()) : copy.leaveMessage}
        cancelLabel={dialog === 'delete' ? copy.cancel : copy.stay}
        confirmLabel={dialog === 'delete' ? copy.confirmDelete : copy.leave}
        destructive={dialog === 'delete'}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog === 'delete') void deleteMedicine();
          else {
            setDialog(null);
            router.back();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: profileScreenColors.background },
  scrollContent: { width: '100%', flexGrow: 1, alignItems: 'center' },
  column: { maxWidth: 528, paddingHorizontal: 24, alignSelf: 'center', boxSizing: 'border-box' },
  back: { minHeight: 56, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 },
  backText: { color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  title: { marginTop: 24, color: profileScreenColors.ink, fontFamily, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  safety: { marginTop: 12, marginBottom: 16, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26 },
  label: { marginTop: 20, marginBottom: 8, color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  input: { minHeight: 60, borderWidth: 1.5, borderColor: profileScreenColors.keyBorder, borderRadius: 20, paddingHorizontal: 16, color: profileScreenColors.ink, fontFamily, fontSize: 20, lineHeight: 28, backgroundColor: '#FFFDF9' },
  error: { marginTop: 6, color: '#8A2B1F', fontFamily, fontSize: 18, lineHeight: 26 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  timeChip: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 28, backgroundColor: '#F6EDDF', borderWidth: 1, borderColor: '#E2D5C2' },
  timeChipText: { color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  secondaryButton: { minHeight: 56, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 16, borderRadius: 28, marginTop: 8 },
  secondaryText: { color: colors.accent, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '700', textDecorationLine: 'underline' },
  everyDayChip: { alignSelf: 'flex-start', marginTop: 4 },
  dayChip: { minWidth: 56, minHeight: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, borderRadius: 28, borderWidth: 1, borderColor: profileScreenColors.keyBorder, backgroundColor: '#F6EDDF' },
  daySelected: { backgroundColor: colors.homeOrange, borderColor: colors.homeOrange },
  dayText: { color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  dayTextSelected: { color: '#FFFFFF' },
  saveButton: { minHeight: 60, marginTop: 32, borderRadius: 999, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.homeOrange, paddingHorizontal: 20 },
  saveText: { color: colors.homeOrangeText, fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  deleteButton: { minHeight: 56, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 12, marginTop: 8 },
  deleteText: { color: colors.homeEmergency, fontFamily, fontSize: 18, lineHeight: 26, fontWeight: '700', textDecorationLine: 'underline' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(43,33,24,0.48)', padding: 20 },
  timePicker: { width: '100%', maxWidth: 420, borderRadius: 24, padding: 24, backgroundColor: profileScreenColors.background },
  pickerTitle: { marginBottom: 20, color: profileScreenColors.ink, fontFamily, fontSize: 24, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 },
  stepper: { alignItems: 'center', gap: 6 },
  stepButton: { width: 64, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F6EDDF', borderWidth: 1, borderColor: '#E2D5C2' },
  stepButtonText: { color: profileScreenColors.ink, fontFamily, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  stepValue: { minWidth: 64, color: profileScreenColors.ink, fontFamily, fontSize: 32, lineHeight: 40, fontWeight: '700', textAlign: 'center' },
  timeColon: { color: profileScreenColors.ink, fontFamily, fontSize: 30, lineHeight: 38, fontWeight: '700' },
  ampmButton: { minWidth: 64, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F6EDDF', borderWidth: 1, borderColor: '#E2D5C2', marginTop: 22 },
  ampmText: { color: profileScreenColors.ink, fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '700' },
});
