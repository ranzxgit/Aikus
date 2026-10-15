export type AvatarState = 'idle' | 'thinking' | 'speaking';

export interface AvatarActivity {
  isSending: boolean;
  hasReceivedFirstToken: boolean;
  isSpeaking: boolean;
}

export function getAvatarState(activity: AvatarActivity): AvatarState {
  if (activity.isSpeaking || (activity.isSending && activity.hasReceivedFirstToken)) {
    return 'speaking';
  }

  if (activity.isSending) {
    return 'thinking';
  }

  return 'idle';
}
