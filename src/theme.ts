export const AIKUS_THEME = {
  colors: {
    background: '#FFF9F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F4EEE9',
    primary: '#E87532',
    primaryDark: '#B95722',
    text: '#2D241F',
    textMuted: '#6C5B52',
    border: '#E8D9CD',
    emergency: '#D32F2F',
    success: '#2E7D32',
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 40,
  },
  typography: {
    body: 18,
    bodyLarge: 20,
    heading: 28,
    headingLarge: 36,
  },
  touchTarget: 56,
} as const;

export type AikusTheme = typeof AIKUS_THEME;
