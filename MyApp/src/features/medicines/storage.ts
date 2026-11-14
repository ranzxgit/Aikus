import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { createMedicineRepository } from './repository';

const cancelNotifications = async (identifiers: readonly string[]) => {
  if (Platform.OS === 'web' || identifiers.length === 0) return;
  const Notifications = await import('expo-notifications');
  await Promise.all(identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)));
};

export const medicineRepository = createMedicineRepository(AsyncStorage, Crypto.randomUUID, cancelNotifications);

export async function removeAllMedicineDataForProfile(profileId: string): Promise<void> {
  await medicineRepository.deleteProfileData(profileId);
}
