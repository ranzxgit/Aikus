import assert from 'node:assert/strict';
import test from 'node:test';

import { FROG_INTRO_COPY } from './introCopy.ts';

test('frog garden intro has English and Tagalog copy for every visible text key', () => {
  assert.deepEqual(Object.keys(FROG_INTRO_COPY.en).sort(), Object.keys(FROG_INTRO_COPY.tl).sort());
  for (const copy of Object.values(FROG_INTRO_COPY)) {
    for (const value of Object.values(copy)) {
      assert.ok(value.length > 0);
    }
  }
});
