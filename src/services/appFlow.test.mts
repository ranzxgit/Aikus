import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { getFlowRedirect } from './flowRedirect.ts';
import { createProfileDataStore } from './profileData.ts';
import { hashPin, verifyPin } from './pinSecurity.ts';
import { recordWrongPin } from './pinAttempts.ts';

test('hashes a PIN with a salt and verifies only the matching PIN', async () => {
  const digest = async (value: string) => createHash('sha256').update(value).digest('hex');
  const credential = await hashPin('4821', 'test-salt', digest);
  assert.notEqual(credential.hash, '4821');
  assert.equal(await verifyPin('4821', credential, digest), true);
  assert.equal(await verifyPin('4822', credential, digest), false);
  assert.equal((await hashPin('4821', 'different-salt', digest)).hash === credential.hash, false);
});

test('locks after five wrong PIN attempts for 30 seconds', () => {
  let state = { wrongAttempts: 0, lockedUntil: null as number | null };
  for (let attempt = 1; attempt < 5; attempt += 1) {
    state = recordWrongPin(state, 1_000 + attempt);
    assert.equal(state.locked, false);
  }
  const locked = recordWrongPin(state, 2_000);
  assert.equal(locked.locked, true);
  assert.equal(locked.lockedUntil, 32_000);
  assert.equal(recordWrongPin(locked, 10_000).locked, true);
  assert.equal(recordWrongPin(locked, 32_000).locked, false);
});

test('redirects signed-out app routes to loading and signed-in auth routes to Home', () => {
  assert.equal(getFlowRedirect(false, ['(app)', 'home'], true), '/(auth)/login');
  assert.equal(getFlowRedirect(true, ['(auth)', 'login']), '/(app)/home');
  assert.equal(getFlowRedirect(false, ['(auth)', 'login'], false), '/(auth)/language');
  assert.equal(getFlowRedirect(false, ['(auth)', 'login'], true), null);
});

test('keeps profile chat data under separate local keys', async () => {
  const values = new Map<string, string>();
  const store = createProfileDataStore({
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
  });
  const profileOne = [{ id: 'one', role: 'user' as const, content: 'Hello', createdAt: 1 }];
  const profileTwo = [{ id: 'two', role: 'user' as const, content: 'Kumusta', createdAt: 2 }];

  await store.saveChat('profile-one', profileOne);
  await store.saveChat('profile-two', profileTwo);
  assert.deepEqual(await store.loadChat('profile-one'), profileOne);
  assert.deepEqual(await store.loadChat('profile-two'), profileTwo);
});
