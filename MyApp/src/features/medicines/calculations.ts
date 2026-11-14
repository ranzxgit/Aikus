import type { SupportedLanguage } from '@/config';
import type { DoseLog, DueOccurrence, Medicine, MedicineInput } from './types';
import { isMedicine, validateMedicineInput } from './validation';

const DAY_MS = 24 * 60 * 60 * 1000;
export const SNOOZE_LIMIT = 3;
export const MISSED_AFTER_MS = 30 * 60 * 1000;

export interface NextMedicineReminder {
  medicine: Medicine;
  scheduledAt: Date;
  dueNow: boolean;
}

export interface MedicineScheduleEntry {
  medicineId: string;
  day: number;
  time: string;
}

export function getMedicineSchedulePlan(medicines: readonly Medicine[]): MedicineScheduleEntry[] {
  return medicines
    .filter((medicine) => isMedicine(medicine) && medicine.active)
    .flatMap((medicine) => medicine.days.flatMap((day) => medicine.times.map((time) => ({
      medicineId: medicine.id,
      day,
      time,
    }))));
}

export function getMedicineInputErrors(input: MedicineInput) {
  return validateMedicineInput(input);
}

function localDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function atLocalTime(date: Date, time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

export function getNextMedicineReminder(
  medicines: readonly Medicine[],
  logs: readonly DoseLog[] = [],
  now: Date = new Date(),
): NextMedicineReminder | null {
  const due = getCurrentDueOccurrence(medicines, logs, now);
  let next: NextMedicineReminder | null = due
    ? { medicine: due.medicine, scheduledAt: new Date(due.scheduledAt), dueNow: true }
    : null;
  for (const medicine of medicines) {
    if (!isMedicine(medicine) || !medicine.active) continue;
    for (let offset = 0; offset < 8; offset += 1) {
      const day = localDayIndex(new Date(now.getTime() + offset * DAY_MS));
      if (!medicine.days.includes(day)) continue;
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      for (const time of medicine.times) {
        const schedule = atLocalTime(date, time);
        const occurrenceLogs = logs.filter((log) => log.medicineId === medicine.id && sameInstant(log.scheduledAt, schedule.toISOString()));
        if (occurrenceLogs.some((log) => log.status === 'taken' || log.status === 'skipped' || log.status === 'missed')) continue;
        const snoozes = occurrenceLogs.filter((log) => log.status === 'snoozed');
        const candidate = snoozes.length
          ? new Date(Math.max(...snoozes.map((log) => Date.parse(log.at))) + 10 * 60 * 1000)
          : schedule;
        if (candidate < now) continue;
        if (!next || candidate < next.scheduledAt) {
          next = { medicine, scheduledAt: candidate, dueNow: false };
        }
      }
    }
  }
  return next;
}

export function getHomeReminderSubtitle(
  medicines: readonly Medicine[],
  logs: readonly DoseLog[],
  language: SupportedLanguage,
  now: Date = new Date(),
): string {
  const next = getNextMedicineReminder(medicines, logs, now);
  if (!next) return language === 'tl' ? 'Magdagdag ng unang paalala' : 'Add your first reminder';
  if (next.dueNow && next.scheduledAt.getTime() <= now.getTime()) {
    return language === 'tl' ? 'Oras na po para sa gamot' : 'Time for your medicine';
  }
  const prefix = language === 'tl' ? 'Susunod' : 'Next';
  return `${prefix}: ${next.medicine.name}, ${formatMedicineTime(next.scheduledAt, language)}`;
}

export function formatMedicineTime(date: Date, language: SupportedLanguage): string {
  return new Intl.DateTimeFormat(language === 'tl' ? 'fil-PH' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function sameInstant(left: string, right: string): boolean {
  return new Date(left).getTime() === new Date(right).getTime();
}

export function getCurrentDueOccurrence(
  medicines: readonly Medicine[],
  logs: readonly DoseLog[],
  now: Date = new Date(),
): DueOccurrence | null {
  let due: DueOccurrence | null = null;
  for (const medicine of medicines) {
    if (!medicine.active || !isMedicine(medicine)) continue;
    for (let offset = -1; offset <= 0; offset += 1) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      if (!medicine.days.includes(localDayIndex(date))) continue;
      for (const time of medicine.times) {
        const scheduledAt = atLocalTime(date, time);
        if (scheduledAt.getTime() < Date.parse(medicine.createdAt)) continue;
        const iso = scheduledAt.toISOString();
        const occurrenceLogs = logs.filter((log) => log.medicineId === medicine.id && sameInstant(log.scheduledAt, iso));
        if (occurrenceLogs.some((log) => log.status === 'taken' || log.status === 'skipped' || log.status === 'missed')) continue;
        const snoozes = occurrenceLogs.filter((log) => log.status === 'snoozed');
        const reminderAt = snoozes.length
          ? new Date(Math.max(...snoozes.map((log) => Date.parse(log.at))) + 10 * 60 * 1000)
          : scheduledAt;
        const reminderAge = now.getTime() - reminderAt.getTime();
        if (reminderAge < 0 || reminderAge >= MISSED_AFTER_MS) continue;
        const snoozeCount = snoozes.length;
        if (!due || scheduledAt.getTime() < Date.parse(due.scheduledAt)) due = { medicine, scheduledAt: iso, snoozeCount };
      }
    }
  }
  return due;
}

export function getMissedOccurrences(
  medicines: readonly Medicine[],
  logs: readonly DoseLog[],
  now: Date = new Date(),
): DueOccurrence[] {
  const missed: DueOccurrence[] = [];
  for (const medicine of medicines) {
    if (!medicine.active || !isMedicine(medicine)) continue;
    const createdDate = new Date(medicine.createdAt);
    const firstDate = new Date(createdDate);
    firstDate.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const daysBack = Math.max(0, Math.ceil((today.getTime() - firstDate.getTime()) / DAY_MS));
    for (let offset = -daysBack; offset <= 0; offset += 1) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      if (!medicine.days.includes(localDayIndex(date))) continue;
      for (const time of medicine.times) {
        const scheduledAt = atLocalTime(date, time);
        if (scheduledAt.getTime() < Date.parse(medicine.createdAt)) continue;
        const iso = scheduledAt.toISOString();
        const occurrenceLogs = logs.filter((log) => log.medicineId === medicine.id && sameInstant(log.scheduledAt, iso));
        if (occurrenceLogs.some((log) => log.status === 'taken' || log.status === 'skipped' || log.status === 'missed')) continue;
        const snoozes = occurrenceLogs.filter((log) => log.status === 'snoozed');
        const reminderAt = snoozes.length
          ? new Date(Math.max(...snoozes.map((log) => Date.parse(log.at))) + 10 * 60 * 1000)
          : scheduledAt;
        if (now.getTime() - reminderAt.getTime() < MISSED_AFTER_MS) continue;
        missed.push({ medicine, scheduledAt: iso, snoozeCount: snoozes.length });
      }
    }
  }
  return missed;
}

export function canSnooze(logs: readonly DoseLog[], medicineId: string, scheduledAt: string): boolean {
  const snoozeCount = logs.filter((log) => log.medicineId === medicineId
    && sameInstant(log.scheduledAt, scheduledAt)
    && log.status === 'snoozed').length;
  return snoozeCount < SNOOZE_LIMIT;
}

export function isMedicineQuestion(message: string): boolean {
  const normalized = message.toLocaleLowerCase().replace(/[’']/g, "'").trim();
  const englishQuestion = /\b(what|which|list|tell me)\b.{0,40}\b(medicines?|medications?|pills?)\b|\bwhat\b.{0,30}\bdo i take\b/;
  const tagalogQuestion = /\b(anong gamot ko|ano ang (?:mga )?gamot ko|mga gamot ko|ano po ang gamot ko|anong mga gamot ang iniinom ko)\b/;
  return englishQuestion.test(normalized) || tagalogQuestion.test(normalized);
}

export function buildMedicineChatAnswer(medicines: readonly Medicine[], language: SupportedLanguage): string {
  const names = medicines.filter((medicine) => medicine.active && isMedicine(medicine)).map((medicine) => medicine.name);
  if (language === 'tl') {
    const list = names.length ? `Nasa paalala ninyo ang: ${names.join(', ')}.` : 'Wala pa kayong naka-save na paalala sa gamot.';
    return `${list} Sundin po ang payo ng inyong doktor.`;
  }
  const list = names.length ? `Your saved reminders include: ${names.join(', ')}.` : 'You have no saved medicine reminders.';
  return `${list} Please follow your doctor's instructions.`;
}
