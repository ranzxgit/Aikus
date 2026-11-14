import { AI_ENGINE, type SupportedLanguage } from '@/config';
import type { ChatMessage } from '@/types/chat';

import { askWithOllama } from './ollamaEngine';
import { getSystemPrompt } from './prompts';

export async function askAikus(
  messages: ChatMessage[],
  language: SupportedLanguage = 'en',
  onToken?: (token: string) => void,
): Promise<string> {
  if (AI_ENGINE === 'ollama-web') {
    return askWithOllama(messages, language, onToken);
  }

  return askWithOllama(messages, language, onToken);
}

export { getSystemPrompt };
