import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { medicineRepository } from './storage';
import type { DoseLog, Medicine } from './types';

export function useProfileMedicines(profileId: string | undefined, loadError = 'Could not load your medicine reminders. Please try again.') {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!profileId) {
      setMedicines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setMedicines(await medicineRepository.getMedicines(profileId));
    } catch {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [loadError, profileId]);

  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));

  return { medicines, loading, error, reload };
}

export async function getProfileDoseLogs(profileId: string | undefined): Promise<DoseLog[]> {
  return profileId ? medicineRepository.getDoseLogs(profileId) : [];
}
