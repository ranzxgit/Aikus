import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessiblePressable } from '@/components/ui';
import { getEnabledHomeActions, getHomeActionSubtitle, getHomeActionTitle, HOME_ACTIONS } from '@/features/home/actions';
import { getHomeHeaderCopy } from '@/features/home/presentation';
import { getCurrentDueOccurrence, getHomeReminderSubtitle } from '@/features/medicines/calculations';
import { medicineRepository } from '@/features/medicines/storage';
import type { DoseLog, Medicine } from '@/features/medicines/types';
import { useAppFlow } from '@/providers/app-flow-provider';
import { fontFamily, profileScreenColors } from '@/theme/tokens';

const HOME_ENTRANCE_DURATION_MS = 200;
const HOME_ENTRANCE_STAGGER_MS = 40;
const HOME_ENTRANCE_OFFSET = 8;
const HOME_FRAME_MAX_WIDTH = 528;
const HOME_SIDE_PADDING = 24;

const HOME_COPY = {
  en: {
    subtitle: "Take your time. I'm here.",
    settings: 'Settings',
    talkToAikus: 'Talk to Aikus',
    nearestHospital: 'Nearest hospital',
    medicineReminders: 'Medicine reminders',
    frogGarden: 'Frog garden',
    chatSubtitle: 'Tell me about your day.',
    hospitalSubtitle: 'Find a place nearby.',
    addFirstReminder: 'Add your first reminder',
    loadingReminders: 'Loading reminders...',
    reminderLoadError: 'Could not load medicine reminders.',
    findHidingFrogs: 'Find hiding frogs',
  },
  tl: {
    subtitle: 'Dahan-dahan lang. Narito ako.',
    settings: 'Mga setting',
    talkToAikus: 'Kausapin si Aikus',
    nearestHospital: 'Pinakamalapit na ospital',
    medicineReminders: 'Paalala sa gamot',
    frogGarden: 'Palaka Garden',
    chatSubtitle: 'Ikuwento ninyo ang inyong araw.',
    hospitalSubtitle: 'Tingnan ang malapit.',
    addFirstReminder: 'Magdagdag ng unang paalala',
    loadingReminders: 'Kinukuha ang mga paalala...',
    reminderLoadError: 'Hindi makuha ang mga paalala sa gamot.',
    findHidingFrogs: 'Maghanap ng mga palaka',
  },
} as const;

interface HomeEntranceProps {
  children: ReactNode;
  delay: number;
  style?: object;
}

function HomeEntrance({ children, delay, style }: HomeEntranceProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withDelay(delay, withTiming(1, {
      duration: HOME_ENTRANCE_DURATION_MS,
      easing: Easing.out(Easing.quad),
    }));
  }, [delay, progress, reducedMotion]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : progress.value,
    transform: [{ translateY: interpolate(reducedMotion ? 1 : progress.value, [0, 1], [HOME_ENTRANCE_OFFSET, 0]) }],
  }));

  return <Animated.View style={[style, entranceStyle]}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const { activeProfile, language } = useAppFlow();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [remindersLoaded, setRemindersLoaded] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const copy = HOME_COPY[language];
  const header = getHomeHeaderCopy(language, activeProfile?.name);
  const enabledActions = getEnabledHomeActions(HOME_ACTIONS);
  const frameWidth = Math.min(viewportWidth || 390, HOME_FRAME_MAX_WIDTH);
  const actionCopy = {
    talkToAikus: copy.talkToAikus,
    nearestHospital: copy.nearestHospital,
    medicineReminders: copy.medicineReminders,
    frogGarden: copy.frogGarden,
  };
  const subtitleCopy = {
    chatSubtitle: copy.chatSubtitle,
    hospitalSubtitle: copy.hospitalSubtitle,
    addFirstReminder: copy.addFirstReminder,
    findHidingFrogs: copy.findHidingFrogs,
  };
  useFocusEffect(useCallback(() => {
    let mounted = true;
    if (!activeProfile) return () => { mounted = false; };
    setRemindersLoaded(false);
    setReminderError('');
    Promise.all([
      medicineRepository.getMedicines(activeProfile.id),
      medicineRepository.getDoseLogs(activeProfile.id),
    ]).then(([savedMedicines, savedLogs]) => {
      if (!mounted) return;
      setMedicines(savedMedicines);
      setDoseLogs(savedLogs);
      setRemindersLoaded(true);
    }).catch(() => {
      if (!mounted) return;
      setReminderError(copy.reminderLoadError);
      setRemindersLoaded(true);
    });
    return () => { mounted = false; };
  }, [activeProfile, copy.reminderLoadError]));
  const dueOccurrence = getCurrentDueOccurrence(medicines, doseLogs);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24) + 128,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.column, { width: frameWidth }]}>
          <HomeEntrance delay={0}>
            <View style={styles.header}>
              <Text style={styles.wordmark}>Aikus</Text>
              <AccessiblePressable
                accessibilityRole="button"
                accessibilityLabel={copy.settings}
                onPress={() => router.push('/(app)/settings')}
                style={styles.settingsButton}
              >
                <Ionicons name="settings-outline" size={22} color={profileScreenColors.ink} accessibilityElementsHidden />
                <Text style={styles.settingsText}>{copy.settings}</Text>
              </AccessiblePressable>
            </View>
          </HomeEntrance>

          <HomeEntrance delay={HOME_ENTRANCE_STAGGER_MS}>
            <Text accessibilityRole="header" style={styles.greeting}>{header.greeting}</Text>
          </HomeEntrance>

          <HomeEntrance delay={HOME_ENTRANCE_STAGGER_MS * 2}>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </HomeEntrance>

          <View style={styles.actionList}>
            {enabledActions.map((action, index) => {
              const title = getHomeActionTitle(action, language, actionCopy);
              const subtitle = action.id === 'medicine'
                ? reminderError || (remindersLoaded
                  ? getHomeReminderSubtitle(medicines, doseLogs, language)
                  : copy.loadingReminders)
                : getHomeActionSubtitle(action, language, subtitleCopy);
              const accessibilityLabel = `${title}, ${subtitle}`;
              return (
                <HomeEntrance key={action.id} delay={HOME_ENTRANCE_STAGGER_MS * (index + 3)}>
                  <AccessiblePressable
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}
                    onPress={() => {
                      if (action.route) router.push(action.route);
                    }}
                    style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed, index === 0 && styles.firstActionRow]}
                  >
                    <Ionicons name={action.icon} size={28} color={profileScreenColors.ink} accessibilityElementsHidden />
                    <View style={styles.actionText}>
                      <View style={styles.actionTitleRow}>
                        {action.id === 'medicine' && dueOccurrence ? <View accessibilityElementsHidden style={styles.dueDot} /> : null}
                        <Text style={styles.actionTitle}>{title}</Text>
                      </View>
                      <Text style={[styles.actionSubtitle, action.id === 'frogGarden' && styles.frogActionSubtitle]}>{subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={profileScreenColors.secondaryText} accessibilityElementsHidden />
                  </AccessiblePressable>
                </HomeEntrance>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: profileScreenColors.background },
  scrollView: { flex: 1 },
  scrollContent: { width: '100%', flexGrow: 1, alignItems: 'center' },
  column: {
    maxWidth: HOME_FRAME_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: HOME_SIDE_PADDING,
    gap: 0,
    boxSizing: 'border-box',
  },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { color: profileScreenColors.ink, fontSize: 22, lineHeight: 28, fontFamily, fontWeight: '700' },
  settingsButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8, borderRadius: 12 },
  settingsText: { color: profileScreenColors.ink, fontSize: 18, lineHeight: 26, fontFamily, fontWeight: '600' },
  greeting: { marginTop: 32, color: profileScreenColors.ink, fontSize: 32, lineHeight: 38, fontFamily, fontWeight: '700' },
  subtitle: { marginTop: 12, color: profileScreenColors.secondaryText, fontSize: 18, lineHeight: 26, fontFamily },
  actionList: { marginTop: 24, borderTopWidth: 1, borderTopColor: profileScreenColors.divider },
  actionRow: {
    minHeight: 88,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: profileScreenColors.divider,
    borderRadius: 2,
  },
  firstActionRow: { borderTopWidth: 0 },
  actionPressed: { backgroundColor: profileScreenColors.rowPressed },
  actionText: { flex: 1, minWidth: 0, gap: 4 },
  actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E8590C' },
  actionTitle: { color: profileScreenColors.ink, fontSize: 22, lineHeight: 28, fontFamily, fontWeight: '700', flexShrink: 1 },
  actionSubtitle: { color: profileScreenColors.secondaryText, fontSize: 18, lineHeight: 26, fontFamily, flexShrink: 1 },
  frogActionSubtitle: { fontSize: 20, lineHeight: 28 },
});
