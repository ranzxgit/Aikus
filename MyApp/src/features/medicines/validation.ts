import type { DoseLog, DoseStatus, Medicine, MedicineInput } from './types';

export type MedicineField = 'name' | 'note' | 'times' | 'days' | 'active';
export type MedicineValidationErrors = Partial<Record<MedicineField, string>>;

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validateMedicineInput(input: MedicineInput): MedicineValidationErrors {
  const errors: MedicineValidationErrors = {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (input.note !== undefined && typeof input.note !== 'string') errors.note = 'Enter a text note.';
  if (!name) errors.name = 'Enter a medicine name.';
  else if (name.length > 40) errors.name = 'Use 40 characters or fewer.';
  if (note.length > 80) errors.note = 'Use 80 characters or fewer.';
  if (!Array.isArray(input.times) || input.times.length < 1) {
    errors.times = 'Add at least one time.';
  } else if (input.times.length > 6) {
    errors.times = 'Choose up to six times.';
  } else if (!input.times.every(isValidTime)) {
    errors.times = 'Choose a valid time.';
  } else if (new Set(input.times).size !== input.times.length) {
    errors.times = 'Each time must be different.';
  }
  if (!Array.isArray(input.days) || input.days.length < 1) {
    errors.days = 'Choose at least one day.';
  } else if (!input.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
    errors.days = 'Choose valid days.';
  } else if (new Set(input.days).size !== input.days.length) {
    errors.days = 'Each day can be chosen once.';
  }
  if (typeof input.active !== 'boolean') errors.active = 'Choose whether reminders are on.';
  return errors;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

export function isMedicine(value: unknown): value is Medicine {
  if (typeof value !== 'object' || value === null) return false;
  const medicine = value as Record<string, unknown>;
  return typeof medicine.id === 'string'
    && medicine.id.length > 0
    && typeof medicine.name === 'string'
    && medicine.name.trim().length > 0
    && medicine.name.length <= 40
    && (medicine.note === undefined || (typeof medicine.note === 'string' && medicine.note.trim().length <= 80))
    && Array.isArray(medicine.times)
    && medicine.times.length >= 1
    && medicine.times.length <= 6
    && medicine.times.every(isValidTime)
    && new Set(medicine.times).size === medicine.times.length
    && Array.isArray(medicine.days)
    && medicine.days.length >= 1
    && medicine.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    && new Set(medicine.days).size === medicine.days.length
    && typeof medicine.active === 'boolean'
    && isIsoDate(medicine.createdAt)
    && isIsoDate(medicine.updatedAt);
}

export function isDoseLog(value: unknown): value is DoseLog {
  if (typeof value !== 'object' || value === null) return false;
  const log = value as Record<string, unknown>;
  const statuses: DoseStatus[] = ['taken', 'skipped', 'snoozed', 'missed'];
  return typeof log.id === 'string'
    && log.id.length > 0
    && typeof log.medicineId === 'string'
    && log.medicineId.length > 0
    && isIsoDate(log.scheduledAt)
    && statuses.includes(log.status as DoseStatus)
    && isIsoDate(log.at);
}

export function normalizeMedicineInput(input: MedicineInput): MedicineInput {
  return {
    name: input.name.trim(),
    note: input.note?.trim() || undefined,
    times: [...input.times].sort(),
    days: [...input.days].sort((a, b) => a - b),
    active: input.active,
  };
}
