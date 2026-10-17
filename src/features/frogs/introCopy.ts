import type { SupportedLanguage } from '@/config';

export const FROG_INTRO_COPY = {
  en: {
    title: 'Palaka Garden',
    subtitle: 'A quiet frog hunt',
    illustration: 'An original little green frog among flowers and garden plants',
    todaysFrog: "Today's frog is hiding in The Garden.",
    instructions: 'Take your time. Tap a frog when you see one.',
    start: 'Start',
    album: 'Frog album',
  },
  tl: {
    title: 'Hanap Palaka',
    subtitle: 'Palaka Garden',
    illustration: 'Isang munting berdeng palaka sa gitna ng mga bulaklak at halaman',
    todaysFrog: 'Nagtatago ang palaka ngayon sa Hardin.',
    instructions: 'Dahan-dahan lang. Pindutin ang palaka kapag nakita ninyo.',
    start: 'Magsimula',
    album: 'Album ng mga palaka',
  },
} as const satisfies Record<SupportedLanguage, Record<string, string>>;
