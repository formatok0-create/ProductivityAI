// Design tokens — ProductivityAI Premium Theme

export const Colors = {
  primary: '#58CC02',
  primaryDark: '#3fa800',
  primaryLight: '#e8f9d9',
  primaryGlow: 'rgba(88, 204, 2, 0.25)',

  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#EBEBEB',
  borderLight: '#F3F3F3',

  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  success: '#58CC02',
  successLight: '#e8f9d9',
  warning: '#FF9600',
  warningLight: '#FFF3E0',
  danger: '#FF4B4B',
  dangerLight: '#FFE5E5',
  info: '#1CB0F6',
  infoLight: '#E3F6FF',

  purple: '#CE82FF',
  purpleLight: '#F3E8FF',
  orange: '#FF9600',
  orangeLight: '#FFF0D6',
  pink: '#FF6B9D',
  pinkLight: '#FFE8F0',
  teal: '#1CB0F6',
  tealLight: '#E0F4FF',

  streakOrange: '#FF9600',
  xpYellow: '#FFD900',
  xpYellowLight: '#FFFBE0',

  overlay: 'rgba(0,0,0,0.4)',
  shadow: 'rgba(0,0,0,0.08)',
  shadowMedium: 'rgba(0,0,0,0.12)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const Radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  round: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  green: {
    shadowColor: '#58CC02',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
