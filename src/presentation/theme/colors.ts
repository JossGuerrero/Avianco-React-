export const colors = {
  primary: '#D32F2F',
  primaryDark: '#B71C1C',
  primaryLight: '#EF5350',
  dark: '#1A1A1A',
  darkSurface: '#242424',
  darkBorder: '#3A3A3A',
  white: '#FFFFFF',
  greyLight: '#BDBDBD',
  grey: '#9E9E9E',
  success: '#4CAF50',
  warning: '#FFB300',
  error: '#E53935',
} as const;

export type ColorKey = keyof typeof colors;
