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
  homeOrange: '#E8590C',
  homeOrangeText: '#1F130B',
  homeTileBorder: '#E9DFD0',
  homeEmergency: '#B3261E',
};

export const splashBackground = '#FFF8F0';
export const splashGlow = '#FFE3CC';
export const splashProgressTrack = '#F0E2D2';
export const splashProgressFill = '#E8590C';
export const splashText = '#2B2118';
export const splashLogoShadow = '#E8590C';

export const profileScreenColors = {
  background: '#FBF6EE',
  divider: '#E9DFD0',
  avatar: '#EFE3D3',
  key: '#F6EDDF',
  keyBorder: '#E2D5C2',
  keyPressed: '#EBDDC8',
  rowPressed: '#F3EADB',
  ink: '#2B2118',
  secondaryText: '#5E5146',
} as const;
export const fontFamily = 'Inter' as const;

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
