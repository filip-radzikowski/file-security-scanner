/** Central design tokens. Components must take every colour, size and font from here. */

export const colors = {
  background: '#FAF8F5',
  ivory: '#FFFEFA',
  ivoryPressed: '#F6F2EA',
  sage: '#8FA58A',
  sageSoft: '#E4EBE1',
  sageDeep: '#4F6A4B', // text-safe sage (>= 5:1 on ivory)
  onSage: '#1F2B1E', // arrow / label colour placed on sage fills
  sand: '#E9E0D1',
  sandSoft: '#F2ECE1',
  sandDeep: '#8C7B5E', // text-safe sand
  ink: '#2B2A27',
  inkSoft: '#66625A', // secondary text (>= 5:1 on ivory)
  inkFaint: '#9A958B', // decorative only
  hairline: '#E9E4DA',
  trail: '#B9B2A2',
  ambient: '#D8CFBF', // scattered background dots
  overlay: 'rgba(250, 248, 245, 0.92)',
  shadow: '#3B3527',
  danger: '#9A4A3C',
  mood: ['#D9CFBE', '#CFCBB4', '#BFC7AE', '#A8BA9F', '#8FA58A'],
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 12, md: 18, lg: 28, xl: 36, pill: 999 } as const;

export const fonts = {
  heading: 'Fraunces_600SemiBold',
  headingRegular: 'Fraunces_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const typography = {
  wordmark: { fontFamily: fonts.heading, fontSize: 44, lineHeight: 52, letterSpacing: -0.5 },
  title: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26 },
  display: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 40 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  button: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
} as const;

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  lifted: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
} as const;

export const hairlineWidth = 1;

/** Minimum touch target (pt) for interactive controls. */
export const hitTarget = 44;

/** Cap for Dynamic Type scaling on fixed-size surfaces (canvas cards). */
export const fixedSurfaceFontScale = 1.25;
export const maxFontScale = 1.8;

export const theme = { colors, spacing, radius, fonts, typography, shadows, hairlineWidth, hitTarget };
export type Theme = typeof theme;
