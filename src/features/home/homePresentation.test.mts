import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getHomeHeaderCopy } from './presentation.ts';
import { getEnabledHomeActions, getHomeActionSubtitle, getHomeActionTitle, HOME_ACTIONS } from './actions.ts';

test('greets by time of day in English and Tagalog', () => {
  const cases = [
    { now: new Date('2026-10-15T01:00:00.000Z'), en: 'Good morning, Rosa', tl: 'Magandang umaga, Rosa' },
    { now: new Date('2026-10-15T05:00:00.000Z'), en: 'Good afternoon, Rosa', tl: 'Magandang hapon, Rosa' },
    { now: new Date('2026-10-15T11:00:00.000Z'), en: 'Good evening, Rosa', tl: 'Magandang gabi, Rosa' },
    { now: new Date('2026-10-15T16:00:00.000Z'), en: 'Good evening, Rosa', tl: 'Magandang gabi, Rosa' },
  ];

  for (const { now, en, tl } of cases) {
    assert.equal(getHomeHeaderCopy('en', ' Rosa ', now).greeting, en);
    assert.equal(getHomeHeaderCopy('tl', ' Rosa ', now).greeting, tl);
  }
});

test('uses a name-free greeting for first-run profiles', () => {
  const now = new Date('2026-10-15T01:00:00.000Z');
  assert.equal(getHomeHeaderCopy('en', '', now).greeting, 'Good morning');
  assert.equal(getHomeHeaderCopy('tl', null, now).greeting, 'Magandang umaga');
});

test('medicine reminders appear as an enabled Home action', () => {
  const enabled = getEnabledHomeActions();
  assert.deepEqual(enabled.map((action) => action.id), ['chat', 'hospital', 'medicine', 'frogGarden']);
  assert.ok(enabled.every((action) => action.enabled));
  assert.equal(HOME_ACTIONS.find((action) => action.id === 'medicine')?.route, '/(app)/medicines');
  assert.equal(HOME_ACTIONS.find((action) => action.id === 'frogGarden')?.route, '/(app)/frog-garden');
});

test('Frog garden Home row is available in both languages and follows the medicine row', () => {
  const enabled = getEnabledHomeActions();
  const frogGarden = enabled.find((action) => action.id === 'frogGarden');
  assert.ok(frogGarden);
  assert.equal(enabled.at(-1)?.id, 'frogGarden');
  assert.equal(frogGarden.route, '/(app)/frog-garden');
  const titles = { talkToAikus: '', nearestHospital: '', medicineReminders: '', frogGarden: '' };
  const subtitles = {
    chatSubtitle: 'Tell me about your day.',
    hospitalSubtitle: 'Find a place nearby.',
    addFirstReminder: 'Add your first reminder',
    findHidingFrogs: 'Find hiding frogs',
  };
  assert.equal(getHomeActionTitle(frogGarden, 'en', titles), 'Frog garden');
  assert.equal(getHomeActionSubtitle(frogGarden, 'en', subtitles), 'Find hiding frogs');
  assert.equal(getHomeActionTitle(frogGarden, 'tl', titles), 'Palaka Garden');
  assert.equal(
    getHomeActionSubtitle(frogGarden, 'tl', { ...subtitles, findHidingFrogs: 'Maghanap ng mga palaka' }),
    'Maghanap ng mga palaka',
  );
});

test('medicine subtitle uses only supplied reminder data or the localized empty state', () => {
  const medicine = HOME_ACTIONS.find((action) => action.id === 'medicine');
  assert.ok(medicine);
  const copy = {
    chatSubtitle: 'Tell me about your day.',
    hospitalSubtitle: 'Find a place nearby.',
    addFirstReminder: 'Add your first reminder',
  };
  assert.equal(
    getHomeActionSubtitle(medicine, 'en', copy, { name: 'Test medicine', time: '7:30 PM' }),
    'Next: Test medicine, 7:30 PM',
  );
  assert.equal(getHomeActionSubtitle(medicine, 'en', copy, null), 'Add your first reminder');
  assert.equal(getHomeActionSubtitle(medicine, 'tl', copy, null), 'Magdagdag ng unang paalala');
});

test('Emergency on Home keeps an explicit confirmation step', async () => {
  const uiSource = await readFile(new URL('../../components/ui/index.tsx', import.meta.url), 'utf8');
  const homeEmergency = uiSource.slice(uiSource.indexOf('export function EmergencyButton'), uiSource.indexOf('const styles = StyleSheet.create'));
  assert.match(homeEmergency, /globalThis\.confirm\(/);
  assert.match(homeEmergency, /Alert\.alert\(/);
  assert.match(homeEmergency, /accessibilityHint=\{t\.emergencyConfirmationMessage\}/);
});

test('Home action list has the specified order, labels, and no old tiles or avatar', async () => {
  const screenSource = await readFile(new URL('../../app/(app)/home.tsx', import.meta.url), 'utf8');
  const actionSource = await readFile(new URL('./actions.ts', import.meta.url), 'utf8');
  assert.match(screenSource, /getEnabledHomeActions\(HOME_ACTIONS\)/);
  assert.match(actionSource, /chatbubble-outline/);
  assert.match(actionSource, /medkit-outline/);
  assert.match(actionSource, /leaf-outline/);
  assert.match(screenSource, /Talk to Aikus/);
  assert.match(screenSource, /Nearest hospital/);
  assert.doesNotMatch(screenSource, /AikusAvatar|talkCard|tileGrid|ollamaRetry/);
});
