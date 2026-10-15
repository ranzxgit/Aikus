export const SPLASH_TOTAL_MS = 4_000;
export const SPLASH_EXIT_START_MS = 3_650;
export const SPLASH_MAXIMUM_MS = 6_000;
export const SPLASH_EXIT_MS = SPLASH_TOTAL_MS - SPLASH_EXIT_START_MS;
export const SPLASH_REDUCED_MOTION_FADE_MS = 600;

export type SplashAnimationPreference = 'system' | 'on' | 'off';
export type SplashMotionMode = 'full' | 'reduced';

export function shouldForceFullMotion(
  isDevelopment: boolean,
  isWeb: boolean,
  motionParameter: string | string[] | undefined,
): boolean {
  return isDevelopment && isWeb && motionParameter === 'on';
}

export function getSplashMotionMode(
  systemReducedMotion: boolean,
  preference: SplashAnimationPreference,
  forceFullMotion = false,
): SplashMotionMode {
  if (forceFullMotion || preference === 'on') return 'full';
  if (preference === 'off') return 'reduced';
  return systemReducedMotion ? 'reduced' : 'full';
}

type Sleep = (durationMs: number) => Promise<void>;

const sleep: Sleep = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

export function waitForSplashMinimum(
  startedAt: number,
  minimumMs = SPLASH_TOTAL_MS,
  pause: Sleep = sleep,
): Promise<void> {
  const remaining = Math.max(0, startedAt + minimumMs - Date.now());
  return pause(remaining);
}

export function waitForSplashMaximum(startedAt: number, pause: Sleep = sleep): Promise<void> {
  const exitStartAt = startedAt + SPLASH_MAXIMUM_MS - SPLASH_EXIT_MS;
  return pause(Math.max(0, exitStartAt - Date.now()));
}

export function createNavigationGuard(): () => boolean {
  let claimed = false;
  return () => {
    if (claimed) return false;
    claimed = true;
    return true;
  };
}

export function getSplashLogoFallbackText(): string {
  return 'AIKUS';
}
