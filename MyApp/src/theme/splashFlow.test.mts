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

test('full splash waits 4000ms before the exit fade can finish', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let splashCanFinish = false;
  const minimum = waitForSplashMinimum(Date.now(), SPLASH_EXIT_START_MS)
    .then(() => new Promise<void>((resolve) => {
      setTimeout(() => {
        splashCanFinish = true;
        resolve();
      }, SPLASH_EXIT_MS);
    }));

  context.mock.timers.tick(SPLASH_EXIT_START_MS - 1);
  await Promise.resolve();
  assert.equal(splashCanFinish, false);
  context.mock.timers.tick(1);
  await Promise.resolve();
  context.mock.timers.tick(SPLASH_EXIT_MS - 1);
  await Promise.resolve();
  assert.equal(splashCanFinish, false);
  context.mock.timers.tick(1);
  await minimum;
  assert.equal(splashCanFinish, true);
  assert.equal(Date.now(), SPLASH_TOTAL_MS);
});

test('reduced motion uses a 400ms entry fade and navigates no earlier than 1500ms', async (context) => {
  assert.equal(getSplashMotionMode(true, 'system'), 'reduced');
  assert.equal(SPLASH_REDUCED_MOTION_FADE_MS, 400);
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let splashCanFinish = false;
  const minimum = waitForSplashMinimum(Date.now(), 1_500).then(() => { splashCanFinish = true; });

  context.mock.timers.tick(1_499);
  await Promise.resolve();
  assert.equal(splashCanFinish, false);
  context.mock.timers.tick(1);
  await minimum;
  assert.equal(splashCanFinish, true);
  assert.equal(Date.now(), 1_500);
});

test('reduced motion keeps the logo scales fixed and progress line static', async () => {
  const splashSource = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');
  assert.match(splashSource, /if \(isReduced\) \{\s*return \{ width: PROGRESS_WIDTH \};/);
  assert.match(splashSource, /if \(reducedMotion\) \{[\s\S]*?logoScale\.value = 1;[\s\S]*?glowScale\.value = 1;/);
  assert.doesNotMatch(splashSource, /logoScale\.value = withTiming\(1/);
});

test('progress begins its 1.4-second sweep when it fades in', async () => {
  const splashSource = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');
  assert.match(splashSource, /const PROGRESS_SWEEP_MS = 1_400/);
  assert.match(splashSource, /sweep\.value = withDelay\(\s*PROGRESS_FADE_START_MS,\s*withRepeat\(/);
});

test('maximum timeout starts the exit fade so the splash ends by 6000ms', async (context) => {
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

test('logo rendering uses the fallback text when its image fails to load', async () => {
  const splashSource = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');
  assert.match(splashSource, /hasLogo\s*\?\s*\(\s*<SplashLogoImage/);
  assert.match(splashSource, /<Text style=\{styles\.logoFallback\}>\{getSplashLogoFallbackText\(\)\}<\/Text>/);
  assert.match(splashSource, /fontSize: 40/);
  assert.match(splashSource, /letterSpacing: 8/);
});

test('splash does not render the Emergency button, tagline, dots, or waking text', async () => {
  const splashSource = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');
  // No emergency button
  assert.doesNotMatch(splashSource, /EmergencyButton|emergencyOpacity|emergencyVisible|callNow/);
  // Keep localized copy without rendering it.
  assert.match(splashSource, /Waking up Aikus/);
  assert.match(splashSource, /Ginigising si Aikus/);
  assert.match(splashSource, /Your friendly companion/);
  assert.match(splashSource, /Ang kaibigan ninyo/);
  assert.doesNotMatch(splashSource, /accessibilityRole="header"/);
  assert.doesNotMatch(splashSource, /styles\.dots\b/);
  assert.doesNotMatch(splashSource, /styles\.dot\b/);
  assert.doesNotMatch(splashSource, /styles\.tagline\b/);
  assert.doesNotMatch(splashSource, /styles\.loadingText\b/);
});

test('SPLASH_TOTAL_MS is 4000 and SPLASH_MAXIMUM_MS is 6000', () => {
  assert.equal(SPLASH_TOTAL_MS, 4000);
  assert.equal(SPLASH_MAXIMUM_MS, 6000);
});

test('splash exit starts at 3600ms leaving a 400ms exit fade', () => {
  assert.equal(SPLASH_EXIT_START_MS, 3600);
  assert.equal(SPLASH_EXIT_MS, 400);
  assert.equal(SPLASH_EXIT_START_MS + SPLASH_EXIT_MS, SPLASH_TOTAL_MS);
});
