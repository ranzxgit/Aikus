import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createNavigationGuard,
  getSplashMotionMode,
  getSplashLogoFallbackText,
  SPLASH_EXIT_MS,
  SPLASH_EXIT_START_MS,
  SPLASH_MAXIMUM_MS,
  SPLASH_REDUCED_MOTION_FADE_MS,
  SPLASH_TOTAL_MS,
  shouldForceFullMotion,
  waitForSplashMaximum,
  waitForSplashMinimum,
} from './splashFlow.ts';

test('full splash runs for at least 4000ms before navigation can begin', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let exitCanStart = false;
  const minimum = waitForSplashMinimum(Date.now(), SPLASH_EXIT_START_MS).then(() => { exitCanStart = true; });

  context.mock.timers.tick(SPLASH_EXIT_START_MS - 1);
  await Promise.resolve();
  assert.equal(exitCanStart, false);
  context.mock.timers.tick(1);
  await minimum;
  assert.equal(exitCanStart, true);
  context.mock.timers.tick(SPLASH_EXIT_MS);
  assert.equal(Date.now(), SPLASH_TOTAL_MS);
});

test('reduced motion uses the short fade animation but retains the four-second minimum', async (context) => {
  assert.equal(getSplashMotionMode(true, 'system'), 'reduced');
  assert.equal(SPLASH_REDUCED_MOTION_FADE_MS, 600);
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let exitCanStart = false;
  const minimum = waitForSplashMinimum(Date.now(), SPLASH_EXIT_START_MS).then(() => { exitCanStart = true; });

  context.mock.timers.tick(SPLASH_EXIT_START_MS - 1);
  await Promise.resolve();
  assert.equal(exitCanStart, false);
  context.mock.timers.tick(1);
  await minimum;
  assert.equal(exitCanStart, true);
  context.mock.timers.tick(SPLASH_EXIT_MS);
  assert.equal(Date.now(), SPLASH_TOTAL_MS);
});

test('maximum timeout starts the 350ms exit fade so the splash ends by 6000ms', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let maximumReached = false;
  const maximum = waitForSplashMaximum(Date.now()).then(() => { maximumReached = true; });

  context.mock.timers.tick(SPLASH_EXIT_START_MS - 1);
  await Promise.resolve();
  assert.equal(maximumReached, false);
  context.mock.timers.tick(1);
  await Promise.resolve();
  assert.equal(maximumReached, false);
  context.mock.timers.tick(SPLASH_MAXIMUM_MS - SPLASH_EXIT_MS - SPLASH_EXIT_START_MS);
  await maximum;
  assert.equal(maximumReached, true);
  context.mock.timers.tick(SPLASH_EXIT_MS);
  assert.equal(Date.now(), SPLASH_MAXIMUM_MS);
});

test('navigation guard allows the splash to navigate once', () => {
  const claimNavigation = createNavigationGuard();
  assert.equal(claimNavigation(), true);
  assert.equal(claimNavigation(), false);
});

test('motion=on forces full motion only in development on web', () => {
  assert.equal(shouldForceFullMotion(true, true, 'on'), true);
  assert.equal(shouldForceFullMotion(false, true, 'on'), false);
  assert.equal(shouldForceFullMotion(true, false, 'on'), false);
  assert.equal(shouldForceFullMotion(true, true, 'off'), false);
  assert.equal(getSplashMotionMode(true, 'system', true), 'full');
  assert.equal(getSplashMotionMode(true, 'on'), 'full');
  assert.equal(getSplashMotionMode(false, 'off'), 'reduced');
});

test('missing logo uses the AIKUS text fallback', () => {
  assert.equal(getSplashLogoFallbackText(), 'AIKUS');
});

test('splash does not render the Emergency button', async () => {
  const splashSource = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(splashSource, /EmergencyButton|emergencyOpacity|emergencyVisible|callNow/);
});
