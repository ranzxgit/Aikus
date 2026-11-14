import type { SupportedLanguage } from '@/config';
import { getTimeContext } from '../../services/time.ts';

export function getHomeHeaderCopy(
  language: SupportedLanguage,
  name?: string | null,
  now: Date = new Date(),
): { greeting: string } {
  const { partOfDay } = getTimeContext(language, now);
  const trimmedName = name?.trim();
  if (language === 'en') {
    const timeOfDay = partOfDay.en === 'morning' || partOfDay.en === 'afternoon' ? partOfDay.en : 'evening';
    return {
      greeting: `Good ${timeOfDay}${trimmedName ? `, ${trimmedName}` : ''}`,
    };
  }
  const timeOfDay = partOfDay.tl === 'umaga' || partOfDay.tl === 'hapon' ? partOfDay.tl : 'gabi';
  return {
    greeting: `Magandang ${timeOfDay}${trimmedName ? `, ${trimmedName}` : ''}`,
  };
}
