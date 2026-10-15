import type { SupportedLanguage } from '@/config';
import type { ChatMessage } from '@/types/chat';

export type TextSize = 'small' | 'normal' | 'large';
export type AnimationPreference = 'system' | 'on' | 'off';

export interface LocalProfile {
  id: string;
  name: string;
  avatarColor: string;
  hasPin: boolean;
  language: SupportedLanguage;
  createdAt: number;
}

export interface ProfileSettings {
  language: SupportedLanguage;
  textSize: TextSize;
  readAloudEnabled: boolean;
  animationPreference: AnimationPreference;
}

export interface PinCredential {
  salt: string;
  hash: string;
}

export type StoredChatHistory = ChatMessage[];
