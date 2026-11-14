import type { AvatarState } from './avatarState';

export const MASCOT_POSES = ['happy', 'wave', 'listen', 'sleep', 'think', 'smile'] as const;

export type MascotPose = (typeof MASCOT_POSES)[number];

export interface MascotMotionSettings {
  poseTransitionDuration: number;
  bounce: boolean;
}

export function getChatMascotPose(state: AvatarState, inactive: boolean): MascotPose {
  if (inactive && state === 'idle') return 'sleep';
  if (state === 'thinking') return 'think';
  if (state === 'speaking') return 'listen';
  return 'happy';
}

export function getMascotMotionSettings(reducedMotion: boolean, gentleBounce: boolean): MascotMotionSettings {
  return {
    poseTransitionDuration: reducedMotion ? 0 : 200,
    bounce: !reducedMotion && gentleBounce,
  };
}
