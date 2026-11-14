import { Platform } from 'react-native';
import type * as ExpoNotifications from 'expo-notifications';
import type { SupportedLanguage } from '@/config';
import { getMedicineSchedulePlan } from './calculations';
import { medicineRepository } from './storage';
import type { Medicine, PermissionState, ReminderNotificationRecord } from './types';

type NotificationResponse = ExpoNotifications.NotificationResponse;

export const MEDICINE_NOTIFICATION_CHANNEL = 'medicine-reminders';
const SNOOZE_MS = 10 * 60 * 1000;

let notificationHandlerConfigured = false;

async function getNotifications(): Promise<typeof ExpoNotifications> {
  const Notifications = await import('expo-notifications');
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }
  return Notifications;
}

export async function getMedicineNotificationPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'undetermined';
  const Notifications = await getNotifications();
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return permissions.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestMedicineNotificationPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'undetermined';
  const Notifications = await getNotifications();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MEDICINE_NOTIFICATION_CHANNEL, {
      name: 'Medicine reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8590C',
    });
  }
  const permissions = await Notifications.requestPermissionsAsync();
  return permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ? 'granted'
    : 'denied';
}

function notificationCopy(medicine: Medicine, language: SupportedLanguage) {
  return language === 'tl'
    ? { title: 'Oras na po para sa gamot', body: medicine.name }
    : { title: 'Time for your medicine', body: medicine.name };
}

async function cancelRecords(
  Notifications: typeof ExpoNotifications,
  records: readonly ReminderNotificationRecord[],
): Promise<void> {
  await Promise.all(records.map((record) => Notifications.cancelScheduledNotificationAsync(record.id)));
}

export async function rescheduleMedicineReminders(
  profileId: string,
  language: SupportedLanguage,
): Promise<void> {
  if (Platform.OS === 'web') {
    await medicineRepository.saveNotificationRecords(profileId, []);
    return;
  }
  const Notifications = await getNotifications();
  const previousRecords = await medicineRepository.getNotificationRecords(profileId);
  await cancelRecords(Notifications, previousRecords);
  await medicineRepository.saveNotificationRecords(profileId, []);
  const permission = await getMedicineNotificationPermission();
  if (permission !== 'granted') {
    await medicineRepository.saveNotificationRecords(profileId, []);
    return;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MEDICINE_NOTIFICATION_CHANNEL, {
      name: 'Medicine reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8590C',
    });
  }

  const medicines = await medicineRepository.getMedicines(profileId);
  const schedule = getMedicineSchedulePlan(medicines);
  const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]));
  const records: ReminderNotificationRecord[] = [];
  try {
    for (const item of schedule) {
      const medicine = medicineById.get(item.medicineId);
      if (!medicine) continue;
      const [hour, minute] = item.time.split(':').map(Number);
      const scheduledAt = nextScheduledAt(item.day, hour, minute).toISOString();
      const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            ...notificationCopy(medicine, language),
            data: {
              kind: 'medicine-reminder',
              profileId,
              medicineId: medicine.id,
              scheduledAt,
              day: item.day,
              time: item.time,
              snoozeCount: 0,
            },
            sound: false,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday: (item.day + 1) % 7 + 1,
            hour,
            minute,
            repeats: true,
            channelId: MEDICINE_NOTIFICATION_CHANNEL,
          },
        });
      records.push({
        id: identifier,
        profileId,
        medicineId: medicine.id,
        scheduledAt,
        snoozeCount: 0,
      });
      await medicineRepository.saveNotificationRecords(profileId, records);
    }
  } catch (error) {
    await cancelRecords(Notifications, records);
    await medicineRepository.saveNotificationRecords(profileId, []);
    throw error;
  }
}

function nextScheduledAt(day: number, hour: number, minute: number, now: Date = new Date()): Date {
  const date = new Date(now);
  const targetDateDay = (day + 1) % 7;
  let daysAhead = (targetDateDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  if (date <= now) {
    daysAhead = 7;
    date.setDate(date.getDate() + daysAhead);
  }
  return date;
}

export async function scheduleSnoozeReminder(
  profileId: string,
  medicine: Medicine,
  scheduledAt: string,
  snoozeCount: number,
  language: SupportedLanguage,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = await getNotifications();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      ...notificationCopy(medicine, language),
      data: { kind: 'medicine-reminder', profileId, medicineId: medicine.id, scheduledAt, snoozeCount },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + SNOOZE_MS),
      channelId: MEDICINE_NOTIFICATION_CHANNEL,
    },
  });
  const records = await medicineRepository.getNotificationRecords(profileId);
  await medicineRepository.saveNotificationRecords(profileId, [
    ...records,
    { id: identifier, profileId, medicineId: medicine.id, scheduledAt, snoozeCount },
  ]);
}

export function getMedicineNotificationData(
  response: NotificationResponse,
): { profileId: string; medicineId: string; scheduledAt: string; snoozeCount: number } | null {
  const data = response.notification.request.content.data;
  if (!data
    || data.kind !== 'medicine-reminder'
    || typeof data.profileId !== 'string'
    || typeof data.medicineId !== 'string'
    || typeof data.scheduledAt !== 'string'
    || !Number.isFinite(Date.parse(data.scheduledAt))
    || !Number.isInteger(data.snoozeCount)
    || Number(data.snoozeCount) < 0
    || Number(data.snoozeCount) > 3) return null;
  let occurrenceAt = data.scheduledAt;
  if (Number.isInteger(data.day) && Number(data.day) >= 0 && Number(data.day) <= 6
    && typeof data.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.time)) {
    occurrenceAt = mostRecentScheduledAt(Number(data.day), data.time).toISOString();
  }
  return {
    profileId: data.profileId,
    medicineId: data.medicineId,
    scheduledAt: occurrenceAt,
    snoozeCount: Number(data.snoozeCount),
  };
}

function mostRecentScheduledAt(day: number, time: string, now: Date = new Date()): Date {
  const date = new Date(now);
  const jsDay = (day + 1) % 7;
  const daysSince = (date.getDay() - jsDay + 7) % 7;
  date.setDate(date.getDate() - daysSince);
  const [hour, minute] = time.split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  if (date > now) date.setDate(date.getDate() - 7);
  return date;
}
