import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { recordWrongPin } from '../../services/pinAttempts.ts';

const profileScreen = await readFile(new URL('./login.tsx', import.meta.url), 'utf8');
const pinScreen = await readFile(new URL('./pin.tsx', import.meta.url), 'utf8');

test('profile select lists every saved profile and an Add profile row', () => {
  assert.match(profileScreen, /profiles\.map\(\(profile\)/);
  assert.match(profileScreen, /accessibilityLabel=\{`\$\{profile\.name\}, \$\{isTagalog/);
  assert.match(profileScreen, /accessibilityLabel=\{copy\.addProfile\}/);
  assert.match(profileScreen, /styles\.profileRow/);
  assert.match(profileScreen, /name="chevron-forward"/);
});

test('PIN keypad adds digits and auto-submits when all four dots are filled', () => {
  assert.match(pinScreen, /setPin\(\(current\) => current\.length < PIN_LENGTH \? `\$\{current\}\$\{digit\}` : current\)/);
  assert.match(pinScreen, /if \(pin\.length !== PIN_LENGTH\) return;[\s\S]*?setTimeout\(\(\) => void submit\(pin\), 0\)/);
  assert.match(pinScreen, /filled=\{index < pin\.length\}/);
  assert.match(pinScreen, /const keypadWidth = keySize \* 3 \+ KEY_GAP \* 2/);
});

test('Delete removes the last entered digit', () => {
  assert.match(pinScreen, /setPin\(\(current\) => current\.slice\(0, -1\)\)/);
  assert.match(pinScreen, /accessibilityLabel=\{key === 'delete' \? copy\.delete : key\}/);
  assert.match(pinScreen, /event\.key === 'Backspace'/);
});

test('Skip PIN is rendered only when the profile is allowed to skip', () => {
  assert.match(pinScreen, /const canSkipPin = profile !== undefined && !profile\.hasPin/);
  assert.match(pinScreen, /\{canSkipPin \? \(/);
});

test('wrong PIN feedback is localized and the fifth attempt starts a 30-second lockout', () => {
  assert.match(pinScreen, /That PIN is not right\. Please try again\./);
  assert.match(pinScreen, /Hindi tama ang PIN\. Subukan ulit\./);
  assert.match(pinScreen, /copy\.locked\(remainingLockSeconds\)/);

  let state = { wrongAttempts: 0, lockedUntil: null as number | null };
  for (let attempt = 1; attempt < 5; attempt += 1) {
    state = recordWrongPin(state, 1_000 + attempt);
  }
  const locked = recordWrongPin(state, 2_000);
  assert.equal(locked.lockedUntil, 32_000);
  assert.equal(recordWrongPin(locked, 10_000).locked, true);
});
