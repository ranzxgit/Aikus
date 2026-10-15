import type { SupportedLanguage } from '@/config';
import type { ChatMessage } from '@/types/chat';

export function shouldShowQuickReplies(messages: ChatMessage[]): boolean {
  return messages.length === 0 || messages.every((message) => message.id === 'welcome-message');
}

export function isSendDisabled(draft: string, isSending: boolean): boolean {
  return !draft.trim() || isSending;
}

export function shouldSubmitOnEnter(key: string, shiftKey: boolean): boolean {
  return key === 'Enter' && !shiftKey;
}

export function getChatGreeting(language: SupportedLanguage): string {
  return language === 'tl'
    ? 'Magandang araw po! Ako si Aikus. Kumusta kayo ngayon?'
    : "Hello! I'm Aikus. How are you today?";
}

export function getQuickReplies(language: SupportedLanguage): string[] {
  return language === 'tl'
    ? ['Mabuti naman ako', 'Nalulungkot ako', 'Magkuwento ka', 'Anong araw ngayon?']
    : ["I'm doing well", 'I feel lonely', 'Tell me a story', 'What day is it?'];
}
