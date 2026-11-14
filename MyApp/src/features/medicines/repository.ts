import type { DoseLog, Medicine, MedicineInput, ReminderNotificationRecord } from './types';
import { isDoseLog, isMedicine, normalizeMedicineInput, validateMedicineInput } from './validation';

export interface MedicineStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const medicineKey = (profileId: string) => `aikus.profile.${profileId}.medicines.v1`;
const doseLogKey = (profileId: string) => `aikus.profile.${profileId}.dose-logs.v1`;
const notificationKey = (profileId: string) => `aikus.profile.${profileId}.medicine-notifications.v1`;

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function isReminderNotificationRecord(value: unknown): value is ReminderNotificationRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && record.id.length > 0
    && typeof record.profileId === 'string'
    && record.profileId.length > 0
    && typeof record.medicineId === 'string'
    && record.medicineId.length > 0
    && isIsoTimestamp(record.scheduledAt)
    && Number.isInteger(record.snoozeCount)
    && Number(record.snoozeCount) >= 0
    && Number(record.snoozeCount) <= 3;
}

async function loadArray<T>(
  storage: MedicineStorage,
  key: string,
  validator: (value: unknown) => value is T,
): Promise<T[]> {
  const serialized = await storage.getItem(key);
  if (!serialized) return [];
  const value: unknown = JSON.parse(serialized);
  if (!Array.isArray(value) || !value.every(validator)) {
    throw new Error(`Stored medicine data failed validation for ${key}.`);
  }
  return value;
}

export function createMedicineRepository(
  storage: MedicineStorage,
  createId: () => string = () => globalThis.crypto.randomUUID(),
  cancelNotifications: (identifiers: readonly string[]) => Promise<void> = async () => {},
) {
  const getMedicines = (profileId: string) => loadArray(storage, medicineKey(profileId), isMedicine);
  const getDoseLogs = (profileId: string) => loadArray(storage, doseLogKey(profileId), isDoseLog);
  const getNotificationRecords = async (profileId: string) => {
    const records = await loadArray(storage, notificationKey(profileId), isReminderNotificationRecord);
    if (records.some((record) => record.profileId !== profileId)) {
      throw new Error('Stored reminder notification data belongs to another profile.');
    }
    return records;
  };

  return {
    getMedicines,
    getDoseLogs,
    getNotificationRecords,
    async saveMedicines(profileId: string, medicines: Medicine[]): Promise<void> {
      const valid = medicines.filter(isMedicine);
      if (valid.length !== medicines.length) throw new Error('Refusing to save invalid medicine data.');
      await storage.setItem(medicineKey(profileId), JSON.stringify(valid));
    },
    async saveDoseLogs(profileId: string, logs: DoseLog[]): Promise<void> {
      const valid = logs.filter(isDoseLog);
      if (valid.length !== logs.length) throw new Error('Refusing to save invalid dose log data.');
      await storage.setItem(doseLogKey(profileId), JSON.stringify(valid));
    },
    async saveNotificationRecords(profileId: string, records: ReminderNotificationRecord[]): Promise<void> {
      if (records.some((record) => !isReminderNotificationRecord(record) || record.profileId !== profileId)) {
        throw new Error('Refusing to save invalid reminder notification data.');
      }
      await storage.setItem(notificationKey(profileId), JSON.stringify(records));
    },
    async upsertMedicine(profileId: string, input: MedicineInput, id?: string): Promise<Medicine> {
      const errors = validateMedicineInput(input);
      if (Object.keys(errors).length > 0) throw new Error('Medicine details are invalid.');
      const medicines = await getMedicines(profileId);
      const existing = id ? medicines.find((medicine) => medicine.id === id) : undefined;
      const now = new Date().toISOString();
      const normalized = normalizeMedicineInput(input);
      const medicine: Medicine = {
        ...normalized,
        id: existing?.id ?? id ?? createId(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await this.saveMedicines(profileId, existing
        ? medicines.map((item) => item.id === medicine.id ? medicine : item)
        : [...medicines, medicine]);
      return medicine;
    },
    async setMedicineActive(profileId: string, medicineId: string, active: boolean): Promise<void> {
      const medicines = await getMedicines(profileId);
      await this.saveMedicines(profileId, medicines.map((medicine) => medicine.id === medicineId
        ? { ...medicine, active, updatedAt: new Date().toISOString() }
        : medicine));
    },
    async deleteMedicine(profileId: string, medicineId: string): Promise<void> {
      const medicines = await getMedicines(profileId);
      await this.saveMedicines(profileId, medicines.filter((medicine) => medicine.id !== medicineId));
    },
    async addDoseLog(profileId: string, log: DoseLog): Promise<void> {
      if (!isDoseLog(log)) throw new Error('Refusing to save an invalid dose log.');
      const logs = await getDoseLogs(profileId);
      await this.saveDoseLogs(profileId, [...logs, log]);
    },
    async deleteProfileData(profileId: string): Promise<void> {
      const records = await getNotificationRecords(profileId);
      await cancelNotifications(records.map((record) => record.id));
      await Promise.all([
        storage.removeItem(medicineKey(profileId)),
        storage.removeItem(doseLogKey(profileId)),
        storage.removeItem(notificationKey(profileId)),
      ]);
    },
  };
}
