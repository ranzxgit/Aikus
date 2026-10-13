import type { SupportedLanguage } from '@/config';
import { getTimeContext } from './time.ts';

export type TimeQuestionKind = 'time' | 'date';

function normalizeQuestion(message: string): string {
  return message
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim();
}

function containsPhrase(message: string, phrases: readonly string[]): boolean {
  const paddedMessage = ` ${message} `;
  return phrases.some((phrase) => paddedMessage.includes(` ${phrase} `));
}

export function detectTimeQuestion(message: string): TimeQuestionKind | null {
  const normalized = normalizeQuestion(message);
  if (
    containsPhrase(normalized, [
      'what time',
      "what's the time",
      'what is the time',
      'tell me the time',
      'anong oras',
      "ano'ng oras",
    ])
  ) {
    return 'time';
  }
  if (
    containsPhrase(normalized, [
      'what date',
      "what's the date",
      'what is the date',
      "today's date",
      'what day',
      'anong petsa',
      'anong araw',
      'petsa ngayon',
      'araw ngayon',
    ])
  ) {
    return 'date';
  }
  return null;
}

export function getDirectTimeAnswer(
  message: string,
  language: SupportedLanguage,
  now: Date = new Date(),
): string | null {
  const question = detectTimeQuestion(message);
  if (!question) {
    return null;
  }

  const context = getTimeContext(language, now);
  if (question === 'time') {
    return language === 'tl' ? `${context.time} na po.` : `It is ${context.time} now.`;
  }
  return language === 'tl' ? `Ngayong ${context.date} po.` : `Today is ${context.date}.`;
}
