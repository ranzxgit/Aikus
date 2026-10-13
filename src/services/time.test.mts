import assert from 'node:assert/strict';
import test from 'node:test';

import { getTimeContext } from './time.ts';
import { detectTimeQuestion, getDirectTimeAnswer } from './timeQuestions.ts';

test('formats Manila date, time, and parts of day for a fixed instant', () => {
  const fixedDate = new Date('2026-10-13T11:06:00.000Z');
  const tagalog = getTimeContext('tl', fixedDate);
  const english = getTimeContext('en', fixedDate);

  assert.equal(tagalog.date, 'Martes, Oktubre 13, 2026');
  assert.equal(tagalog.time, '7:06 ng gabi');
  assert.deepEqual(tagalog.partOfDay, { en: 'evening', tl: 'gabi' });
  assert.equal(english.date, 'Tuesday, October 13, 2026');
  assert.equal(english.time, '7:06 PM');
});

test('detects time questions in English and Tagalog and answers without a model', () => {
  const fixedDate = new Date('2026-10-13T11:06:00.000Z');
  assert.equal(detectTimeQuestion("What's the time?"), 'time');
  assert.equal(detectTimeQuestion('Anong oras na po?'), 'time');
  assert.equal(detectTimeQuestion("What's the date today?"), 'date');
  assert.equal(detectTimeQuestion('Anong araw ngayon?'), 'date');
  assert.equal(getDirectTimeAnswer('Anong oras na po?', 'tl', fixedDate), '7:06 ng gabi na po.');
  assert.equal(getDirectTimeAnswer('What day is it?', 'en', fixedDate), 'Today is Tuesday, October 13, 2026.');
  assert.equal(detectTimeQuestion('Kumain na ako'), null);
  assert.equal(getDirectTimeAnswer('Kumain na ako', 'tl', fixedDate), null);
});
