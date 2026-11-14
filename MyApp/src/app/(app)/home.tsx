import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/Mascot';
import { AccessiblePressable, EmergencyButton } from '@/components/ui';
import { HOME_ACTIONS, getEnabledHomeActions, getTodayDoseSummary, type DoseStatus } from '@/features/home/actions';
import { medicineRepository } from '@/features/medicines/storage';
import type { Medicine } from '@/features/medicines/types';
import { useAppFlow } from '@/providers/app-flow-provider';
import { colors, fontFamily } from '@/theme/tokens';

const HOME_COPY = {
  en: {
    settings: 'Settings',
    greeting: 'Good afternoon,',
    today: 'Today',
    summary: '2 of 3 medicines taken',
    primary: 'Taken',
    reminder: 'Remind me in 10 min',
    navHome: 'Home',
    navTalk: 'Usap',
    navMedicines: 'Gamot',
    navHelp: 'Tulong',
    genericMedicine: 'medicine',
    aikSays: 'Aik says',
    defaultMessage: 'It’s time for your medicine',
    dueNow: 'Due now',
    later: 'Later',
    taken: 'Taken',
    navHomeShort: 'Home',
    navTalkShort: 'Usap',
    navMedsShort: 'Gamot',
    navHelpShort: 'Tulong',
  },
  tl: {
    settings: 'Mga setting',
    greeting: 'Magandang hapon,',
    today: 'Ngayon',
    summary: '2 sa 3 gamot ang nainom',
    primary: 'Ininom ko na',
    reminder: 'Paalalahanan ako sa 10 min',
    navHome: 'Home',
    navTalk: 'Usap',
    navMedicines: 'Gamot',
    navHelp: 'Tulong',
    genericMedicine: 'gamot',
    aikSays: 'Sabi ni Aik',
    defaultMessage: 'Oras na po para sa gamot',
    dueNow: 'Ngayon na',
    later: 'Mamaya',
    taken: 'Nainom',
    navHomeShort: 'Home',
    navTalkShort: 'Usap',
    navMedsShort: 'Gamot',
    navHelpShort: 'Tulong',
  },
} as const;

const doseSlots = [
  { id: 'morning', label: '8:00 AM', time: '8:00 AM', name: 'Medication', status: 'taken' as const },
  { id: 'midday', label: '12:00 PM', time: '12:00 PM', name: 'Medication', status: 'taken' as const },
  { id: 'afternoon', label: '2:00 PM', time: '2:00 PM', name: 'Medication', status: 'due' as const },
  { id: 'evening', label: '4:00 PM', time: '4:00 PM', name: 'Medication', status: 'later' as const },
];

const HOME_EMERGENCY_DOCK_BOTTOM_INSET = 68;
const HOME_EMERGENCY_DOCK_INITIAL_HEIGHT = 95;

export default function HomeScreen() {
  const { activeProfile, language } = useAppFlow();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [emergencyDockHeight, setEmergencyDockHeight] = useState(HOME_EMERGENCY_DOCK_INITIAL_HEIGHT);
  const copy = HOME_COPY[language];
  const contentWidth = Math.min(viewportWidth || 390, 420);
  const profileName = activeProfile?.name ?? (language === 'tl' ? 'Kaibigan' : 'Friend');
  const enabledHomeActions = getEnabledHomeActions(HOME_ACTIONS);
  const homeActionTitles = {
    talkToAikus: language === 'tl' ? 'Usap sa Aikus' : 'Talk to Aikus',
    nearestHospital: language === 'tl' ? 'Pinakamalapit na ospital' : 'Nearest hospital',
    medicineReminders: language === 'tl' ? 'Mga paalala sa gamot' : 'Medicine reminders',
  };
  const doseSummary = useMemo(() => getTodayDoseSummary(doseSlots), []);
  const nextDoseList = useMemo(() => doseSlots.filter((slot) => slot.status === 'later'), []);

  const nextMedicine = useMemo(() => {
    const activeMedicines = medicines.filter((medicine) => medicine.active);
    return activeMedicines[0] ?? null;
  }, [medicines]);

  const medicineName = nextMedicine?.name ?? copy.genericMedicine;
  const nextReminderTime = '2:00 PM';
  const aikMessage = `${copy.defaultMessage}: ${medicineName}, ${nextReminderTime}.`;

  useFocusEffect(useCallback(() => {
    let mounted = true;
    if (!activeProfile) return () => { mounted = false; };

    void medicineRepository.getMedicines(activeProfile.id).then((savedMedicines) => {
      if (!mounted) return;
      setMedicines(savedMedicines);
    });

    return () => { mounted = false; };
  }, [activeProfile]));

  const navItems = [
    { key: 'home', label: 'Home', icon: 'home', route: '/(app)/home', a11y: 'Home' },
    { key: 'chat', label: language === 'tl' ? 'Usap' : 'Talk', icon: 'chatbubble-ellipses-outline', route: '/(app)/chat', a11y: language === 'tl' ? 'Usap kay Aikus' : 'Talk to Aikus' },
    { key: 'medicines', label: language === 'tl' ? 'Gamot' : 'Medicines', icon: 'medkit-outline', route: '/(app)/medicines', a11y: language === 'tl' ? 'Mga paalala sa gamot' : 'Medicine reminders' },
    { key: 'help', label: language === 'tl' ? 'Tulong' : 'Help', icon: 'help-circle-outline', route: '/(app)/hospitals', a11y: language === 'tl' ? 'Tulong: ospital at emergency' : 'Help: hospital and emergency' },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 16) + HOME_EMERGENCY_DOCK_BOTTOM_INSET + emergencyDockHeight,
          },
        ]}
      >
        <View style={[styles.frame, { width: contentWidth }]}>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <Mascot pose="happy" size={42} decorative />
              <Text style={styles.brandText}>Aikus</Text>
            </View>

            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel={copy.settings}
              onPress={() => router.push('/(app)/settings')}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} accessibilityElementsHidden />
              <Text style={styles.settingsText}>{copy.settings}</Text>
            </AccessiblePressable>
          </View>

          <Text accessibilityRole="header" style={styles.greeting}>{copy.greeting}</Text>
          <Text style={styles.name}>{profileName}</Text>

          <View style={styles.messageCard}>
            <View style={styles.messageHeaderRow}>
              <Mascot pose="happy" size={38} decorative />
              <Text style={styles.cardTitle}>{copy.aikSays}</Text>
            </View>

            <Text style={styles.messageText}>{aikMessage}</Text>

            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel={copy.primary}
              onPress={() => undefined}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{copy.primary}</Text>
            </AccessiblePressable>

            <AccessiblePressable
              accessibilityRole="button"
              accessibilityLabel={copy.reminder}
              onPress={() => undefined}
              style={styles.reminderButton}
            >
              <Text style={styles.reminderText}>{copy.reminder}</Text>
            </AccessiblePressable>
          </View>

          <View style={styles.todayCard}>
            <Text style={styles.todayTitle}>{copy.today}</Text>
            <Text style={styles.summaryText}>
              {language === 'tl'
                ? `${doseSummary.taken} sa ${doseSummary.total} gamot ang nainom`
                : `${doseSummary.taken} of ${doseSummary.total} medicines taken`}
            </Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${doseSummary.percentComplete}%` }]} />
            </View>

            <View style={styles.timelineRow}>
              {doseSlots.map((slot) => {
                const isTaken = slot.status === 'taken';
                const isDue = slot.status === 'due';
                const isLater = slot.status === 'later';
                return (
                  <View key={slot.id} style={styles.timeCell}>
                    <View style={[
                      styles.checkWrap,
                      isTaken && styles.checkedWrap,
                      isDue && styles.dueWrap,
                      isLater && styles.laterWrap,
                    ]}>
                      {isTaken ? <Ionicons name="checkmark" size={14} color="#FFFFFF" accessibilityElementsHidden /> : null}
                    </View>
                    <Text style={[styles.timeText, isDue && styles.dueText, isLater && styles.laterText]}>{slot.label}</Text>
                    <Text style={[styles.timeStatus, isDue && styles.dueStatus, isLater && styles.laterStatus]}>
                      {isTaken ? copy.taken : isDue ? copy.dueNow : isLater ? copy.later : 'Missed'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={language === 'tl' ? 'Palaka Garden, Maghanap ng mga palaka' : 'Palaka Garden, Find hiding frogs'}
            onPress={() => router.push('/(app)/frog-garden')}
            style={styles.gameRow}
          >
            <View style={styles.gameRowLeft}>
              <View style={styles.gameIconWrap}>
                <Ionicons name="leaf-outline" size={24} color={colors.homeOrange} accessibilityElementsHidden />
              </View>
              <View style={styles.gameTextWrap}>
                <Text style={styles.gameTitle}>{language === 'tl' ? 'Palaka Garden' : 'Palaka Garden'}</Text>
                <Text style={styles.gameSubtitle}>{language === 'tl' ? 'Maghanap ng mga palaka' : 'Find hiding frogs'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.text} accessibilityElementsHidden />
          </AccessiblePressable>

          {nextDoseList.length > 0 ? (
            <View style={styles.nextList}>
              {nextDoseList.map((dose) => (
                <View key={dose.id} style={styles.nextItem}>
                  <View style={styles.nextItemTextWrap}>
                    <Text style={styles.nextItemTitle}>{dose.name}</Text>
                    <Text style={styles.nextItemTime}>{dose.time}</Text>
                  </View>
                  <View style={styles.chip}>
                    <Ionicons name="time-outline" size={14} color="#5E5146" accessibilityElementsHidden />
                    <Text style={styles.chipText}>{language === 'tl' ? 'Mamaya' : 'Later'}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        onLayout={(event) => setEmergencyDockHeight(event.nativeEvent.layout.height)}
        style={[
          styles.emergencyDock,
          { bottom: Math.max(insets.bottom, 16) + HOME_EMERGENCY_DOCK_BOTTOM_INSET },
        ]}
      >
        <EmergencyButton language={language} homeVariant />
      </View>

      <View style={styles.bottomBar}>
        {navItems.map((item) => {
          const isActive = item.key === 'home';
          return (
            <AccessiblePressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.a11y}
              onPress={() => router.push(item.route as never)}
              style={styles.navButton}
            >
              <Ionicons
                name={item.icon as 'home' | 'chatbubble-ellipses-outline' | 'medkit-outline' | 'help-circle-outline'}
                size={22}
                color={isActive ? colors.homeOrange : colors.text}
                accessibilityElementsHidden
              />
              <Text numberOfLines={1} style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>
              {isActive ? <View style={styles.activeIndicator} /> : null}
            </AccessiblePressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBF6EE', position: 'relative' },
  emergencyDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9DFD0',
    backgroundColor: '#FBF6EE',
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  frame: {
    alignSelf: 'center',
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    marginBottom: 2,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily,
    fontWeight: '700',
  },
  settingsButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  settingsText: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily,
    fontWeight: '600',
  },
  greeting: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 36,
    fontFamily,
    fontWeight: '700',
    marginTop: 6,
  },
  name: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 36,
    fontFamily,
    fontWeight: '700',
    marginTop: -2,
    marginBottom: 16,
  },
  messageCard: {
    backgroundColor: '#F7F2ED',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9DFD0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  messageHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily,
    fontWeight: '700',
  },
  messageText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 30,
    fontFamily,
    fontWeight: '600',
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 56,
    backgroundColor: colors.homeOrange,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontFamily,
    fontWeight: '700',
  },
  reminderButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderText: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  todayCard: {
    backgroundColor: '#F7F2ED',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9DFD0',
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  todayTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily,
    fontWeight: '700',
  },
  summaryText: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 34,
    fontFamily,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 12,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#F0E2D2',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E8590C',
    borderRadius: 999,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  timeCell: {
    flex: 1,
    alignItems: 'center',
  },
  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E8D7C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: '#F5E7DC',
  },
  checkedWrap: {
    backgroundColor: '#E8590C',
    borderColor: '#E8590C',
  },
  dueWrap: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8590C',
  },
  laterWrap: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9CFC4',
  },
  timeText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  dueText: {
    color: colors.text,
    fontWeight: '700',
  },
  laterText: {
    color: '#5E5146',
  },
  timeStatus: {
    color: '#5E5146',
    fontSize: 14,
    lineHeight: 18,
    fontFamily,
    textAlign: 'center',
  },
  dueStatus: { color: '#2B2118', fontWeight: '700' },
  laterStatus: { color: '#5E5146' },
  gameRow: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F7F2ED',
    borderWidth: 1,
    borderColor: '#E9DFD0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  gameIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBE7D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gameTextWrap: { flex: 1 },
  gameTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily,
    fontWeight: '700',
  },
  gameSubtitle: {
    color: '#5E5146',
    fontSize: 14,
    lineHeight: 20,
    fontFamily,
    fontWeight: '600',
  },
  nextList: {
    marginTop: 18,
    backgroundColor: '#F7F2ED',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9DFD0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9DFD0',
  },
  nextItemTextWrap: { flex: 1, marginRight: 12 },
  nextItemTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily,
    fontWeight: '600',
  },
  nextItemTime: {
    color: '#5E5146',
    fontSize: 14,
    lineHeight: 18,
    fontFamily,
    fontWeight: '600',
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E6D7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chipText: {
    color: '#5E5146',
    fontSize: 12,
    lineHeight: 16,
    fontFamily,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E9DFD0',
    backgroundColor: '#FBF6EE',
    height: 72,
    zIndex: 2,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    position: 'relative',
    paddingTop: 6,
  },
  navText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    maxWidth: '100%',
  },
  navTextActive: { color: colors.homeOrange },
  activeIndicator: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 2,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.homeOrange,
  },
});
