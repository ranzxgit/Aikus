import { EMERGENCY_KEYWORDS } from '../data/emergencyKeywords.ts';

function normalizePhrase(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim();
}

export function hasEmergencyKeyword(message: string): boolean {
  const normalizedMessage = normalizePhrase(message);
  if (!normalizedMessage) {
    return false;
  }

  const paddedMessage = ` ${normalizedMessage} `;
  return [...EMERGENCY_KEYWORDS.english, ...EMERGENCY_KEYWORDS.tagalog].some((keyword) => {
    const phrase = normalizePhrase(keyword);
    return paddedMessage.includes(` ${phrase} `);
  });
}
