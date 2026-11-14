import type { SupportedLanguage } from '@/config';
import type { ChatMessage } from '@/types/chat';
import { buildMedicineChatAnswer, isMedicineQuestion } from './calculations';
import type { Medicine } from './types';

export function createMedicineAnswerer(loadMedicines: (profileId: string) => Promise<Medicine[]>) {
  return async (profileId: string, language: SupportedLanguage, message: string): Promise<string | null> => {
    if (!isMedicineQuestion(message)) return null;
    const medicines = await loadMedicines(profileId);
    return buildMedicineChatAnswer(medicines, language);
  };
}

export function removeMedicineExchangeFromAiContext(
  messages: readonly ChatMessage[],
  medicineNames: readonly string[] = [],
): ChatMessage[] {
  const safeMessages: ChatMessage[] = [];
  const medicineNamePatterns = medicineNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role === 'user' && isMedicineQuestion(message.content)) {
      if (messages[index + 1]?.role === 'assistant') index += 1;
      continue;
    }
    const content = medicineNamePatterns.reduce((value, pattern) => value.replace(pattern, '[saved medicine]'), message.content);
    safeMessages.push({ ...message, content });
  }
  return safeMessages;
}
