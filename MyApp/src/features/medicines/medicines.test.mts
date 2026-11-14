import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildMedicineChatAnswer,
  canSnooze,
  getCurrentDueOccurrence,
  getMedicineSchedulePlan,
  getMissedOccurrences,
  getNextMedicineReminder,
  isMedicineQuestion,
  MISSED_AFTER_MS,
  SNOOZE_LIMIT,
} from './calculations.ts';
import { createMedicineAnswerer, removeMedicineExchangeFromAiContext } from './chat.ts';
import { createMedicineRepository, type MedicineStorage } from './repository.ts';
import type { DoseLog, Medicine, MedicineInput } from './types.ts';
import { isDoseLog, isMedicine, validateMedicineInput } from './validation.ts';

function makeMedicine(id: string, times = ['08:00'], days = [0], active = true): Medicine {
  const now = new Date(2026, 0, 1).toISOString();
  return { id, name: 'Test Medicine A', times, days, active, createdAt: now, updatedAt: now };
}

function makeLog(medicineId: string, scheduledAt: Date, status: DoseLog['status'], at = scheduledAt): DoseLog {
  return {
    id: `${medicineId}-${status}-${at.getTime()}`,
    medicineId,
    scheduledAt: scheduledAt.toISOString(),
    status,
    at: at.toISOString(),
  };
}

function localDayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

test('next reminder selects the earliest chosen day and time across midnight and week rollover', () => {
  const monday = new Date(2026, 9, 19, 23, 55, 0, 0);
  const tuesday = makeMedicine('tuesday', ['00:15'], [1]);
  const next = getNextMedicineReminder([tuesday], [], monday);
  assert.ok(next);
  assert.equal(next.scheduledAt.getDate(), 20);
  assert.equal(next.scheduledAt.getHours(), 0);
  assert.equal(next.scheduledAt.getMinutes(), 15);

  const inactive = makeMedicine('inactive', ['00:05'], [1], false);
  assert.equal(getNextMedicineReminder([inactive], [], monday), null);
  const weekly = makeMedicine('weekly', ['08:00'], [localDayIndex(monday)]);
  const nextWeek = getNextMedicineReminder([weekly], [], new Date(2026, 9, 19, 9, 0));
  assert.ok(nextWeek);
  assert.equal(nextWeek.scheduledAt.getDate(), 26);
});

test('validates required names, time limits, duplicate times and malformed persisted values', () => {
  const base: MedicineInput = { name: '', note: '', times: [], days: [0, 1, 2, 3, 4, 5, 6], active: true };
  assert.equal(validateMedicineInput(base).name, 'Enter a medicine name.');
  assert.equal(validateMedicineInput({ ...base, name: 'Test Medicine A', times: ['08:00', '08:00'] }).times, 'Each time must be different.');
  assert.equal(validateMedicineInput({ ...base, name: 'Test Medicine A', times: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'] }).times, 'Choose up to six times.');
  assert.equal(isMedicine({ ...makeMedicine('bad'), times: ['25:00'] }), false);
  assert.equal(isDoseLog({ ...makeLog('bad', new Date(), 'taken'), status: 'unknown' }), false);
});

test('snoozes are capped and unhandled doses become missed after 30 minutes', () => {
  const scheduledAt = new Date(2026, 9, 19, 8, 0, 0, 0);
  const medicine = {
    ...makeMedicine('med', ['08:00'], [localDayIndex(scheduledAt)]),
    createdAt: new Date(scheduledAt.getTime() - 60_000).toISOString(),
  };
  const snoozes = Array.from({ length: SNOOZE_LIMIT }, (_, index) =>
    makeLog('med', scheduledAt, 'snoozed', new Date(scheduledAt.getTime() + index * 60_000)));
  assert.equal(canSnooze(snoozes, 'med', scheduledAt.toISOString()), false);
  assert.equal(getCurrentDueOccurrence([medicine], [], new Date(scheduledAt.getTime() + MISSED_AFTER_MS - 1))?.medicine.id, 'med');
  assert.equal(getMissedOccurrences([medicine], [], new Date(scheduledAt.getTime() + MISSED_AFTER_MS + 1)).length, 1);
  assert.equal(getMissedOccurrences([medicine], [makeLog('med', scheduledAt, 'taken')], new Date(scheduledAt.getTime() + MISSED_AFTER_MS + 1)).length, 0);
});

test('weekly schedule plan reflects edits, deactivation, and deletion', async () => {
  const values = new Map<string, string>();
  const storage: MedicineStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const repository = createMedicineRepository(storage);
  const input: MedicineInput = { name: 'Test Medicine A', note: '', times: ['08:00', '20:00'], days: [0, 2], active: true };
  const saved = await repository.upsertMedicine('profile-test', input);
  assert.equal(getMedicineSchedulePlan(await repository.getMedicines('profile-test')).length, 4);
  await repository.upsertMedicine('profile-test', { ...input, times: ['09:30'], days: [1] }, saved.id);
  assert.deepEqual(getMedicineSchedulePlan(await repository.getMedicines('profile-test')), [
    { medicineId: saved.id, day: 1, time: '09:30' },
  ]);
  await repository.setMedicineActive('profile-test', saved.id, false);
  assert.equal(getMedicineSchedulePlan(await repository.getMedicines('profile-test')).length, 0);
  await repository.deleteMedicine('profile-test', saved.id);
  assert.equal((await repository.getMedicines('profile-test')).length, 0);
});

test('profile deletion removes medicine data and dose logs', async () => {
  const values = new Map<string, string>();
  const cancelled: string[] = [];
  const storage: MedicineStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const repository = createMedicineRepository(storage, () => 'generated-id', async (identifiers) => {
    cancelled.push(...identifiers);
  });
  const saved = await repository.upsertMedicine('profile-delete', {
    name: 'Test Medicine A', times: ['08:00'], days: [0], active: true,
  });
  await repository.addDoseLog('profile-delete', makeLog(saved.id, new Date(2026, 0, 5, 8), 'taken'));
  await repository.saveNotificationRecords('profile-delete', [{
    id: 'scheduled-id',
    profileId: 'profile-delete',
    medicineId: saved.id,
    scheduledAt: new Date(2026, 0, 5, 8).toISOString(),
    snoozeCount: 0,
  }]);
  await repository.deleteProfileData('profile-delete');
  assert.equal(values.size, 0);
  assert.deepEqual(cancelled, ['scheduled-id']);
});

test('reminder notification records are validated before saving and after loading', async () => {
  const values = new Map<string, string>();
  const storage: MedicineStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const repository = createMedicineRepository(storage);
  await assert.rejects(repository.saveNotificationRecords('profile-test', [{
    id: 'notification-id',
    profileId: 'profile-test',
    medicineId: 'medicine-id',
    scheduledAt: new Date(2026, 0, 5, 8).toISOString(),
    snoozeCount: 4,
  }]), /invalid reminder notification data/i);
  values.set('aikus.profile.profile-test.medicine-notifications.v1', JSON.stringify([{
    id: 'notification-id',
    profileId: 'different-profile',
    medicineId: 'medicine-id',
    scheduledAt: new Date(2026, 0, 5, 8).toISOString(),
    snoozeCount: 0,
  }]));
  await assert.rejects(repository.getNotificationRecords('profile-test'), /validation|another profile/i);
});

test('medicine questions use saved local data and the model context excludes medicine exchanges', async () => {
  let requestedProfile = '';
  const answer = createMedicineAnswerer(async (profileId) => {
    requestedProfile = profileId;
    return [makeMedicine('saved')];
  });
  assert.equal(isMedicineQuestion('What medicines do I take?'), true);
  assert.equal(isMedicineQuestion('Anong gamot ko?'), true);
  assert.equal(await answer('profile-chat', 'en', 'What medicines do I take?'), `Your saved reminders include: Test Medicine A. Please follow your doctor's instructions.`);
  assert.equal(requestedProfile, 'profile-chat');
  const context = removeMedicineExchangeFromAiContext([
    { id: 'hello', role: 'assistant', content: 'Hello.', createdAt: 1 },
    { id: 'question', role: 'user', content: 'What medicines do I take?', createdAt: 2 },
    { id: 'answer', role: 'assistant', content: 'Test Medicine A', createdAt: 3 },
    { id: 'later', role: 'user', content: 'Thank you.', createdAt: 4 },
  ]);
  assert.deepEqual(context.map((message) => message.id), ['hello', 'later']);
  assert.match(buildMedicineChatAnswer([], 'en'), /Please follow your doctor's instructions\./);
});

test('source files contain no medicine-name placeholder from the mockup', async () => {
  const placeholder = ['Lo', 'sartan'].join('');
  const sourceRoot = new URL('../../', import.meta.url);
  const scan = async (directory: URL): Promise<string[]> => {
    const entries = await readdir(directory, { withFileTypes: true });
    const results = await Promise.all(entries.map(async (entry) => {
      const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) return scan(path);
      if (!/\.(tsx?|mts)$/.test(entry.name)) return [];
      const content = await readFile(path, 'utf8');
      return content.includes(placeholder) ? [join(directory.pathname, entry.name)] : [];
    }));
    return results.flat();
  };
  assert.deepEqual(await scan(sourceRoot), []);
});
