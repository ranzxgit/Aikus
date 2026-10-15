import assert from 'node:assert/strict';
import test from 'node:test';

import { EMERGENCY_KEYWORDS } from '../data/emergencyKeywords.ts';
import { getEmergencyCalmMessage, getHealthNote, hasHealthKeyword } from './healthSafety.ts';

test('health terms add a health note in either language', () => {
  for (const message of ['My head hurts', 'I feel sick', 'I am dizzy', 'May lagnat ako', 'Masakit ang ulo ko']) {
    assert.equal(hasHealthKeyword(message), true, message);
  }
  assert.match(getHealthNote('en'), /not a doctor/);
  assert.match(getHealthNote('tl'), /Hindi doktor/);
});

test('ordinary food messages do not get a health note', () => {
  assert.equal(hasHealthKeyword('Kumain na ako'), false);
});

test('every emergency warning phrase produces the fixed emergency message', () => {
  for (const phrase of [...EMERGENCY_KEYWORDS.english, ...EMERGENCY_KEYWORDS.tagalog]) {
    assert.ok(getEmergencyCalmMessage(phrase, 'en'), `Expected emergency message for: ${phrase}`);
    assert.ok(getEmergencyCalmMessage(phrase, 'tl'), `Expected Tagalog emergency message for: ${phrase}`);
  }
  assert.equal(
    getEmergencyCalmMessage('sudden severe headache', 'en'),
    'This may be serious. Please call 911 or ask someone nearby for help now.',
  );
});
