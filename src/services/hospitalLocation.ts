import * as Location from 'expo-location';

import type { Coordinates } from '@/types/hospital';

export type DeviceLocationResult =
  | { status: 'available'; coordinates: Coordinates }
  | { status: 'denied' | 'unavailable' };

export async function getDeviceLocation(): Promise<DeviceLocationResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timedOut = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Location request timed out')), 15000);
    });
    const locationResult = async (): Promise<DeviceLocationResult> => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return { status: 'denied' };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        status: 'available',
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      };
    };

    return await Promise.race([locationResult(), timedOut]);
  } catch {
    return { status: 'unavailable' };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
