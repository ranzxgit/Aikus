import type { SupportedLanguage } from '@/config';

import { hasEmergencyKeyword } from './emergencyKeywordCheck.ts';

const HEALTH_KEYWORDS = [
  'pain',
  'painful',
  'hurt',
  'hurts',
  'sick',
  'dizzy',
  'fever',
  'masakit',
  'sakit',
  'nahihilo',
  'lagnat',
] as const;

const HEALTH_NOTES: Record<SupportedLanguage, string> = {
  en: 'Aikus is not a doctor. For medical help, please see a doctor.',
  tl: 'Hindi doktor si Aikus. Para sa tulong medikal, magpatingin po sa doktor.',
};

const EMERGENCY_MESSAGES: Record<SupportedLanguage, string> = {
  en: 'This may be serious. Please call 911 or ask someone nearby for help now.',
  tl: 'Maaaring seryoso ito. Tumawag po sa 911 o humingi agad ng tulong sa taong malapit sa inyo.',
};

function normalizeMessage(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
}

export function hasHealthKeyword(message: string): boolean {
  const normalized = ` ${normalizeMessage(message)} `;
  return HEALTH_KEYWORDS.some((keyword) => normalized.includes(` ${keyword} `));
}

export function getHealthNote(language: SupportedLanguage): string {
  return HEALTH_NOTES[language];
}

export function getEmergencyCalmMessage(
  message: string,
  language: SupportedLanguage,
): string | undefined {
  return hasEmergencyKeyword(message) ? EMERGENCY_MESSAGES[language] : undefined;
}
