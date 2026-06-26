/**
 * ISOCODELABS Design Tokens
 *
 * Embedded from the ICLabs-Design-BrandOS repository.
 * These are the canonical design tokens that all child products inherit.
 */

// ─── Colors ───────────────────────────────────────────────────────────────────

export const BRAND_COLORS = {
  brand: {
    primary: '#0B0D10',
    secondary: '#1C1F23',
    tertiary: '#9CA3A8',
    surface: '#FAFAF8',
    surfaceMuted: '#ECECE8',
    surfaceAlt: '#D9D9D6',
    white: '#FFFFFF',
    black: '#000000',
    cobalt: '#2563EB',
    copper: '#B8734A',
  },
  neutral: {
    '0': '#FFFFFF',
    '50': '#FAFAF8',
    '100': '#F5F5F3',
    '200': '#ECECE8',
    '300': '#E2E2DE',
    '400': '#D9D9D6',
    '500': '#B7B9BC',
    '600': '#9CA3A8',
    '700': '#6B7076',
    '800': '#3E434A',
    '900': '#1C1F23',
    '950': '#0B0D10',
  },
  accent: {
    blue: '#2563EB',
    blueHover: '#1D4ED8',
    blueActive: '#1E40AF',
    copper: '#B8734A',
    copperHover: '#A9653E',
    copperActive: '#8F5533',
  },
  semantic: {
    success: '#16A34A',
    successBg: '#ECFDF3',
    warning: '#D97706',
    warningBg: '#FFF7ED',
    danger: '#DC2626',
    dangerBg: '#FEF2F2',
    info: '#2563EB',
    infoBg: '#EFF6FF',
  },
  emphasis: {
    default: 'accent.copper',
    hover: 'accent.copperHover',
    active: 'accent.copperActive',
  },
  text: {
    primary: '#0B0D10',
    secondary: '#4B5563',
    tertiary: '#9CA3A8',
    inverse: '#FFFFFF',
    disabled: '#C5C7CA',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#FAFAF8',
    tertiary: '#ECECE8',
    inverse: '#0B0D10',
    elevated: '#FFFFFF',
    darkElevated: '#24282E',
    glass: 'rgba(255,255,255,0.72)',
  },
  border: {
    subtle: '#ECECE8',
    default: '#D9D9D6',
    strong: '#9CA3A8',
    inverse: 'rgba(255,255,255,0.12)',
    darkDefault: 'rgba(255,255,255,0.08)',
    darkSubtle: 'rgba(255,255,255,0.05)',
  },
  alpha: {
    '0': 0,
    '5': 0.05,
    '10': 0.1,
    '20': 0.2,
    '30': 0.3,
    '40': 0.4,
    '50': 0.5,
    '60': 0.6,
    '70': 0.7,
    '80': 0.8,
    '90': 0.9,
    '100': 1,
  },
  contrast: {
    minimum: 4.5,
    minimumLargeText: 3,
  },
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const BRAND_TYPOGRAPHY = {
  fontFamily: {
    display: 'Inter',
    heading: 'Inter',
    body: 'Inter',
    mono: 'JetBrains Mono',
  },
  fontWeight: {
    thin: 100,
    extraLight: 200,
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extraBold: 800,
  },
  fontSize: {
    displayXL: '72px',
    displayLG: '60px',
    displayMD: '48px',
    h1: '40px',
    h2: '32px',
    h3: '28px',
    h4: '24px',
    h5: '20px',
    h6: '18px',
    bodyXL: '20px',
    bodyLG: '18px',
    body: '16px',
    bodySM: '14px',
    caption: '12px',
    micro: '11px',
  },
  lineHeight: {
    display: '1.05',
    heading: '1.15',
    body: '1.7',
    compact: '1.4',
  },
  letterSpacing: {
    display: '-0.04em',
    heading: '-0.025em',
    body: '0em',
    caps: '0.08em',
  },
  paragraphWidth: {
    comfortable: '70ch',
    reading: '75ch',
    wide: '90ch',
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const BRAND_SPACING = {
  scale: {
    '0': '0',
    '2': '2px',
    '4': '4px',
    '6': '6px',
    '8': '8px',
    '12': '12px',
    '16': '16px',
    '20': '20px',
    '24': '24px',
    '32': '32px',
    '40': '40px',
    '48': '48px',
    '56': '56px',
    '64': '64px',
    '72': '72px',
    '80': '80px',
    '96': '96px',
    '112': '112px',
    '128': '128px',
    '160': '160px',
    '192': '192px',
  },
  touchTarget: {
    minimum: '44px',
    preferred: '48px',
  },
} as const;

// ─── Motion ───────────────────────────────────────────────────────────────────

export const BRAND_MOTION = {
  duration: {
    instant: '0ms',
    micro: '80ms',
    fast: '150ms',
    normal: '250ms',
    medium: '350ms',
    slow: '500ms',
    slower: '700ms',
    hero: '1200ms',
  },
  delay: {
    none: '0ms',
    xs: '50ms',
    sm: '100ms',
    md: '150ms',
    lg: '250ms',
    xl: '400ms',
  },
  easing: {
    linear: 'linear',
    standard: 'cubic-bezier(0.4,0,0.2,1)',
    enter: 'cubic-bezier(0.16,1,0.3,1)',
    exit: 'cubic-bezier(0.7,0,0.84,0)',
    decisive: 'cubic-bezier(0.22,1,0.36,1)',
    hero: 'cubic-bezier(0.19,1,0.22,1)',
  },
  scale: {
    hover: '1.02',
    active: '0.98',
    focus: '1.01',
  },
  opacity: {
    hidden: '0',
    visible: '1',
    disabled: '0.45',
  },
  presets: {
    fadeIn: { duration: 'motion.duration.normal', easing: 'motion.easing.enter' },
    fadeUp: { duration: 'motion.duration.medium', translateY: '16px', easing: 'motion.easing.enter' },
    fadeDown: { duration: 'motion.duration.medium', translateY: '-16px', easing: 'motion.easing.enter' },
    scaleIn: { duration: 'motion.duration.fast', scale: '0.96', easing: 'motion.easing.decisive' },
    heroReveal: { duration: 'motion.duration.hero', easing: 'motion.easing.hero' },
  },
  accessibility: {
    reducedMotionFallback: true,
    keyboardOutlineOffset: '2px',
  },
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const BRAND_SHADOWS = {
  elevation: {
    none: 'none',
    xs: '0 1px 2px rgba(11,13,16,0.04)',
    sm: '0 2px 6px rgba(11,13,16,0.06)',
    md: '0 8px 24px rgba(11,13,16,0.08)',
    lg: '0 16px 48px rgba(11,13,16,0.12)',
    xl: '0 32px 72px rgba(11,13,16,0.16)',
  },
  semantic: {
    button: '0 6px 16px rgba(11,13,16,0.08)',
    card: '0 10px 30px rgba(11,13,16,0.08)',
    modal: '0 40px 120px rgba(11,13,16,0.22)',
    tooltip: '0 12px 30px rgba(11,13,16,0.18)',
    floating: '0 20px 60px rgba(0,0,0,0.18)',
    glass: '0 8px 32px rgba(0,0,0,0.08)',
  },
  blur: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '32px',
    glass: '24px',
  },
} as const;

// ─── Radius ───────────────────────────────────────────────────────────────────

export const BRAND_RADIUS = {
  scale: {
    none: '0',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '40px',
    pill: '999px',
    circle: '50%',
  },
  border: {
    width: {
      hairline: '0.5px',
      thin: '1px',
      regular: '2px',
      heavy: '4px',
    },
    style: {
      default: 'solid',
      subtle: 'solid',
      focus: 'solid',
    },
  },
  focusRing: {
    width: '2px',
    style: 'solid',
    color: 'accent.blue',
    offset: '2px',
  },
} as const;
