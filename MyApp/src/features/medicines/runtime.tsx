import * as Crypto from 'expo-crypto';
import { router, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import type { NotificationResponse } from 'expo-notifications';

import { useAppFlow } from '@/providers/app-flow-provider';
import { medicineRepository } from './storage';
import { getCurrentDueOccurrence, getMissedOccurrences } from './calculations';
import { getMedicineNotificationData, rescheduleMedicineReminders } from './notifications';
import type { DoseLog } from './types';

const ERROR_COPY = {
  en: 'Could not update your medicine reminders. Please check notification settings and try again.',
  tl: 'Hindi na-update ang mga paalala sa gamot. Suriin ang notification settings at subukan ulit.',
} as const;

export function MedicineReminderRuntime() {
  const { activeProfile, language } = useAppFlow();
  const segments = useSegments();
  const checking = useRef(false);
  const openedOccurrence = useRef('');
  const openOccurrence = useCallback((profileId: string, medicineId: string, scheduledAt: string, snoozeCount: number) => {
    const occurrenceKey = `${profileId}:${medicineId}:${scheduledAt}:${snoozeCount}`;
    if (openedOccurrence.current === occurrenceKey) return;
    openedOccurrence.current = occurrenceKey;
    router.push({
      pathname: '/(app)/medicine-due',
      params: { profileId, medicineId, scheduledAt, snoozeCount: String(snoozeCount) },
    });
  }, []);

  useEffect(() => {
    if (!activeProfile) return;
    let mounted = true;
    void rescheduleMedicineReminders(activeProfile.id, language).catch(() => {
      if (!mounted) return;
      if (Platform.OS === 'web') globalThis.alert(ERROR_COPY[language]);
      else Alert.alert('Aikus', ERROR_COPY[language]);
    });
    return () => { mounted = false; };
  }, [activeProfile, language]);

  useEffect(() => {
    if (!activeProfile) return;
    let mounted = true;
    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const [medicines, logs] = await Promise.all([
          medicineRepository.getMedicines(activeProfile.id),
          medicineRepository.getDoseLogs(activeProfile.id),
        ]);
        const missed = getMissedOccurrences(medicines, logs);
        if (missed.length) {
          const missedLogs: DoseLog[] = missed.map((occurrence) => ({
            id: Crypto.randomUUID(),
            medicineId: occurrence.medicine.id,
            scheduledAt: occurrence.scheduledAt,
            status: 'missed',
            at: new Date().toISOString(),
          }));
          await medicineRepository.saveDoseLogs(activeProfile.id, [...logs, ...missedLogs]);
        }
        if (!mounted) return;
        const due = getCurrentDueOccurrence(medicines, [...logs, ...missed.map((occurrence) => ({
          id: '',
          medicineId: occurrence.medicine.id,
          scheduledAt: occurrence.scheduledAt,
          status: 'missed' as const,
          at: new Date().toISOString(),
        }))]);
        const isAlreadyOnDueScreen = segments.at(-1) === 'medicine-due';
        if (due && !isAlreadyOnDueScreen) {
          openOccurrence(activeProfile.id, due.medicine.id, due.scheduledAt, due.snoozeCount);
        }
      } finally {
        checking.current = false;
      }
    };
    void check().catch(() => {
      if (mounted) console.warn('Medicine reminder check failed.');
    });
    const timer = setInterval(() => {
      void check().catch(() => {
        if (mounted) console.warn('Medicine reminder check failed.');
      });
    }, 30_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [activeProfile, openOccurrence, segments]);

  useEffect(() => {
    if (!activeProfile || Platform.OS === 'web') return;
    let mounted = true;
    let subscription: { remove: () => void } | undefined;
    const handleResponse = async (Notifications: typeof import('expo-notifications'), response: NotificationResponse) => {
      const data = getMedicineNotificationData(response);
      if (!data) return;
      void Notifications.clearLastNotificationResponseAsync().catch(() => console.warn('Could not clear the handled medicine reminder response.'));
      if (data.profileId !== activeProfile.id) return;
      openOccurrence(data.profileId, data.medicineId, data.scheduledAt, data.snoozeCount);
    };
    void import('expo-notifications').then(async (Notifications) => {
      if (!mounted) return;
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        void handleResponse(Notifications, response);
      });
      const response = await Notifications.getLastNotificationResponseAsync();
      if (mounted && response) await handleResponse(Notifications, response);
    }).catch(() => {
      if (mounted) console.warn('Could not initialize medicine reminder notification handling.');
    });
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [activeProfile, openOccurrence]);

  return null;
}
