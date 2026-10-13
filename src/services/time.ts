import type { SupportedLanguage } from '@/config';

const PHILIPPINES_TIME_ZONE = 'Asia/Manila';

export type PartOfDayEnglish = 'morning' | 'afternoon' | 'evening' | 'night';
export type PartOfDayTagalog = 'umaga' | 'hapon' | 'gabi';

export interface TimeContext {
  date: string;
  time: string;
  partOfDay: {
    en: PartOfDayEnglish;
    tl: PartOfDayTagalog;
  };
}

function getPartOfDay(hour: number): TimeContext['partOfDay'] {
  if (hour >= 5 && hour < 12) {
    return { en: 'morning', tl: 'umaga' };
  }
  if (hour >= 12 && hour < 17) {
    return { en: 'afternoon', tl: 'hapon' };
  }
  if (hour >= 17 && hour < 21) {
    return { en: 'evening', tl: 'gabi' };
  }
  return { en: 'night', tl: 'gabi' };
}

export function getTimeContext(language: SupportedLanguage, now: Date = new Date()): TimeContext {
  const locale = language === 'tl' ? 'fil-PH' : 'en-US';
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: PHILIPPINES_TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now);

  const hour24 = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: PHILIPPINES_TIME_ZONE,
      hour: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .find((part) => part.type === 'hour')?.value,
  );
  const minute = new Intl.DateTimeFormat('en-US', {
    timeZone: PHILIPPINES_TIME_ZONE,
    minute: '2-digit',
  })
    .formatToParts(now)
    .find((part) => part.type === 'minute')?.value?.padStart(2, '0') ?? '00';
  const hour12 = hour24 % 12 || 12;
  const partOfDay = getPartOfDay(hour24);
  const time = language === 'en'
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: PHILIPPINES_TIME_ZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now)
    : `${hour12}:${minute} ng ${partOfDay.tl}`;

  return { date, time, partOfDay };
}

export function formatTimeContextLine(language: SupportedLanguage, now: Date = new Date()): string {
  const context = getTimeContext(language, now);
  return `Current date and time: ${context.date}, ${context.time} (Philippines time). Part of day: ${context.partOfDay[language]}.`;
}

export function getTimeGreeting(language: SupportedLanguage, now: Date = new Date()): string {
  const context = getTimeContext(language, now);
  if (language === 'en') {
    return `Good ${context.partOfDay.en}.`;
  }
  return `Magandang ${context.partOfDay.tl} po.`;
}
