export const colors = {
  background: '#FAF7F2',
  card: '#FFFFFF',
  text: '#2B2118',
  secondaryText: '#5C5148',
  primary: '#3A2E26',
  accent: '#285B49',
  border: '#E8E0D5',
  danger: '#8F1D18',
  focus: '#285B49',
};

export const splashBackground = '#FFE3CC';

export const languageBackground = '#D8E8F0';
export const ink = '#1F2A33';
export const inkSecondary = '#3E4C57';
export const accent = '#BF571A';

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;
export const radius = { card: 16, screen: 24, pill: 999 } as const;
export const typeScale = {
  largeTitle: { fontSize: 34, lineHeight: 42, fontWeight: '700' as const },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '700' as const },
  body: { fontSize: 20, lineHeight: 29 },
  label: { fontSize: 18, lineHeight: 26 },
  button: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
};
export const softShadow = {
  boxShadow: '0px 8px 24px rgba(43, 33, 24, 0.06)',
} as const;

// White on accent is 7.8:1; white on danger is 8.9:1. Secondary text on the background is 7.2:1.
