export interface Medicine {
  id: string;
  name: string;
  note?: string;
  times: string[];
  days: number[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DoseStatus = 'taken' | 'skipped' | 'snoozed' | 'missed';

export interface DoseLog {
  id: string;
  medicineId: string;
  scheduledAt: string;
  status: DoseStatus;
  at: string;
}

export interface MedicineInput {
  name: string;
  note?: string;
  times: string[];
  days: number[];
  active: boolean;
}

export interface ReminderNotificationRecord {
  id: string;
  profileId: string;
  medicineId: string;
  scheduledAt: string;
  snoozeCount: number;
}

export type PermissionState = 'undetermined' | 'granted' | 'denied';

export interface DueOccurrence {
  medicine: Medicine;
  scheduledAt: string;
  snoozeCount: number;
}
