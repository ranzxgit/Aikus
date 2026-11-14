import assert from 'node:assert/strict';
import test from 'node:test';

import { hasEmergencyKeyword } from './emergencyKeywordCheck.ts';

test('detects emergency phrases in English, including curly apostrophes', () => {
  for (const message of ['I have chest pain', "I can't breathe", 'I fell down', 'This is an emergency']) {
    assert.equal(hasEmergencyKeyword(message), true, message);
  }
  assert.equal(hasEmergencyKeyword('I can’t breathe'), true);
});

test('detects emergency phrases in Tagalog', () => {
  for (const message of [
    'Tulong po',
    'Hindi ako makahinga',
    'Masakit ang dibdib ko',
    'Nahulog ako',
    'Baka atake ito',
  ]) {
    assert.equal(hasEmergencyKeyword(message), true, message);
  }
});

test('does not flag ordinary messages', () => {
  assert.equal(hasEmergencyKeyword('Kumain na ako'), false);
  assert.equal(hasEmergencyKeyword('The fellows arrived early'), false);
  assert.equal(hasEmergencyKeyword('My chest pain is gone'), true);
});
