import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { SupportedLanguage } from '@/config';

export type HomeActionIcon = ComponentProps<typeof Ionicons>['name'];
export type HomeActionRoute = '/(app)/chat' | '/(app)/hospitals' | '/(app)/medicines' | '/(app)/frog-garden';

export interface MedicineReminderSummary {
  name: string;
  time: string;
}

export interface HomeAction {
  id: 'chat' | 'hospital' | 'medicine' | 'frogGarden';
  icon: HomeActionIcon;
  titleKey: 'talkToAikus' | 'nearestHospital' | 'medicineReminders' | 'frogGarden';
  subtitleKey?: 'chatSubtitle' | 'hospitalSubtitle' | 'addFirstReminder' | 'findHidingFrogs';
  subtitle?: (language: SupportedLanguage, nextMedicine?: MedicineReminderSummary | null) => string;
  route: HomeActionRoute | null;
  enabled: boolean;
}

const ACTION_COPY: Record<SupportedLanguage, {
  chatSubtitle: string;
  hospitalSubtitle: string;
  medicineReminders: string;
  frogGarden: string;
  findHidingFrogs: string;
  addFirstReminder: string;
  next: string;
}> = {
  en: {
    chatSubtitle: 'Tell me about your day.',
    hospitalSubtitle: 'Find a place nearby.',
    medicineReminders: 'Medicine reminders',
    frogGarden: 'Frog garden',
    findHidingFrogs: 'Find hiding frogs',
    addFirstReminder: 'Add your first reminder',
    next: 'Next',
  },
  tl: {
    chatSubtitle: 'Ikuwento ninyo ang inyong araw.',
    hospitalSubtitle: 'Tingnan ang malapit.',
    medicineReminders: 'Paalala sa gamot',
    frogGarden: 'Palaka Garden',
    findHidingFrogs: 'Maghanap ng mga palaka',
    addFirstReminder: 'Magdagdag ng unang paalala',
    next: 'Susunod',
  },
};

export const HOME_ACTIONS: readonly HomeAction[] = [
  {
    id: 'chat',
    icon: 'chatbubble-outline',
    titleKey: 'talkToAikus',
    subtitleKey: 'chatSubtitle',
    route: '/(app)/chat',
    enabled: true,
  },
  {
    id: 'hospital',
    icon: 'medkit-outline',
    titleKey: 'nearestHospital',
    subtitleKey: 'hospitalSubtitle',
    route: '/(app)/hospitals',
    enabled: true,
  },
  {
    id: 'medicine',
    icon: 'medical-outline',
    titleKey: 'medicineReminders',
    subtitle: (language, nextMedicine) => {
      const copy = ACTION_COPY[language];
      return nextMedicine
        ? `${copy.next}: ${nextMedicine.name}, ${nextMedicine.time}`
        : copy.addFirstReminder;
    },
    route: '/(app)/medicines',
    enabled: true,
  },
  {
    id: 'frogGarden',
    icon: 'leaf-outline',
    titleKey: 'frogGarden',
    subtitleKey: 'findHidingFrogs',
    route: '/(app)/frog-garden',
    enabled: true,
  },
];

export function getEnabledHomeActions(actions: readonly HomeAction[] = HOME_ACTIONS): HomeAction[] {
  return actions.filter((action) => action.enabled);
}

export function getHomeActionTitle(
  action: HomeAction,
  language: SupportedLanguage,
  copy: Record<HomeAction['titleKey'], string>,
): string {
  return action.id === 'medicine' || action.id === 'frogGarden'
    ? ACTION_COPY[language][action.id === 'medicine' ? 'medicineReminders' : 'frogGarden']
    : copy[action.titleKey];
}

export function getHomeActionSubtitle(
  action: HomeAction,
  language: SupportedLanguage,
  copy: Record<NonNullable<HomeAction['subtitleKey']>, string>,
  nextMedicine?: MedicineReminderSummary | null,
): string {
  return action.subtitle
    ? action.subtitle(language, nextMedicine)
    : action.subtitleKey
      ? copy[action.subtitleKey]
      : '';
}
