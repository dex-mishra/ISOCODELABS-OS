/**
 * ISOCODELABS Design Tokens — Single Source of Truth
 * ===================================================
 *
 * These are the literal, machine-readable values of the ISOCODELABS design
 * language, inherited from the ISOCODELABS Design System (BrandOS).
 *
 * Isocodelabs Ops Hub is an ISOCODELABS product, so it inherits design.md
 * (how it looks and behaves) and brand.md (why it feels that way) directly.
 * Every other design decision in this codebase should resolve back to a token
 * defined here. Never hardcode a value that already exists as a token.
 *
 * Consumed by: tailwind.config.ts (build-time) and any runtime that needs a
 * design value (charts, inline styles, canvas, etc.).
 *
 * Source of philosophy: .kiro/steering/design-language.md and brand.md.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Color  (design/tokens/colors.json)
 *
 * Cobalt blue is the ONLY default interactive color (buttons, links, focus,
 * form states). Copper is reserved for emphasis and craftsmanship moments —
 * never a second action color. Light is the default theme.
 * ────────────────────────────────────────────────────────────────────────── */
export const color = {
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
    0: '#FFFFFF',
    50: '#FAFAF8',
    100: '#F5F5F3',
    200: '#ECECE8',
    300: '#E2E2DE',
    400: '#D9D9D6',
    500: '#B7B9BC',
    600: '#9CA3A8',
    700: '#6B7076',
    800: '#3E434A',
    900: '#1C1F23',
    950: '#0B0D10',
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
  /** Copper. Highlight / craftsmanship only — use rarely. */
  emphasis: {
    default: '#B8734A',
    hover: '#A9653E',
    active: '#8F5533',
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
  contrast: {
    minimum: 4.5,
    minimumLargeText: 3,
  },
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 * Typography  (design/tokens/typography.json)
 * Inter for UI. JetBrains Mono for data, code and metrics.
 * ────────────────────────────────────────────────────────────────────────── */
export const typography = {
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
    'display-xl': '72px',
    'display-lg': '60px',
    'display-md': '48px',
    h1: '40px',
    h2: '32px',
    h3: '28px',
    h4: '24px',
    h5: '20px',
    h6: '18px',
    'body-xl': '20px',
    'body-lg': '18px',
    body: '16px',
    'body-sm': '14px',
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

/* ──────────────────────────────────────────────────────────────────────────
 * Spacing  (design/tokens/spacing.json) — named by pixel value.
 * Strict superset of the 8px rhythm; values are self-evident in code.
 * ────────────────────────────────────────────────────────────────────────── */
export const spacing = {
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
} as const;

export const touchTarget = { minimum: '44px', preferred: '48px' } as const;

/* ──────────────────────────────────────────────────────────────────────────
 * Radius  (design/tokens/radius.json)
 * Buttons/inputs = md (12). Cards = lg (16). Modals = xl (24).
 * ────────────────────────────────────────────────────────────────────────── */
export const radius = {
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
} as const;

export const focusRing = {
  width: '2px',
  color: color.accent.blue,
  offset: '2px',
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 * Shadows  (design/tokens/shadows.json) — depth communicates structure,
 * not decoration. Tuned for the calm #0B0D10 ink, not pure black.
 * ────────────────────────────────────────────────────────────────────────── */
export const shadow = {
  none: 'none',
  xs: '0 1px 2px rgba(11,13,16,0.04)',
  sm: '0 2px 6px rgba(11,13,16,0.06)',
  md: '0 8px 24px rgba(11,13,16,0.08)',
  lg: '0 16px 48px rgba(11,13,16,0.12)',
  xl: '0 32px 72px rgba(11,13,16,0.16)',
  button: '0 6px 16px rgba(11,13,16,0.08)',
  card: '0 10px 30px rgba(11,13,16,0.08)',
  modal: '0 40px 120px rgba(11,13,16,0.22)',
  tooltip: '0 12px 30px rgba(11,13,16,0.18)',
  floating: '0 20px 60px rgba(0,0,0,0.18)',
  glass: '0 8px 32px rgba(0,0,0,0.08)',
} as const;

export const blur = {
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '16px',
  xl: '32px',
  glass: '24px',
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 * Motion  (design/tokens/motion.json) — motion must communicate.
 * Always pair with prefers-reduced-motion fallbacks.
 * ────────────────────────────────────────────────────────────────────────── */
export const motion = {
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
  easing: {
    linear: 'linear',
    standard: 'cubic-bezier(0.4,0,0.2,1)',
    enter: 'cubic-bezier(0.16,1,0.3,1)',
    exit: 'cubic-bezier(0.7,0,0.84,0)',
    decisive: 'cubic-bezier(0.22,1,0.36,1)',
    hero: 'cubic-bezier(0.19,1,0.22,1)',
  },
  scale: {
    hover: 1.02,
    active: 0.98,
    focus: 1.01,
  },
  opacity: {
    hidden: 0,
    visible: 1,
    disabled: 0.45,
  },
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 * Layout & breakpoints  (design/tokens/breakpoints.json)
 * ────────────────────────────────────────────────────────────────────────── */
export const breakpoint = {
  mobileLg: '480px',
  tablet: '768px',
  tabletLg: '1024px',
  desktop: '1280px',
  desktopLg: '1440px',
  desktopXL: '1600px',
  ultrawide: '1920px',
} as const;

export const container = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
  reading: '760px',
  dashboard: '1600px',
} as const;

export const layout = {
  maxContentWidth: '1440px',
  sidebarWidth: '280px',
  collapsedSidebarWidth: '88px',
  headerHeight: '72px',
  mobileHeaderHeight: '64px',
} as const;

export const zIndex = {
  base: 0,
  content: 10,
  sticky: 100,
  dropdown: 200,
  overlay: 300,
  drawer: 400,
  modal: 500,
  toast: 600,
  tooltip: 700,
  max: 9999,
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 * Icons  (design/tokens/icons.json) — Lucide, outlined, round caps/joins.
 * ────────────────────────────────────────────────────────────────────────── */
export const icon = {
  library: 'Lucide',
  size: { xs: 12, sm: 16, md: 20, lg: 24, xl: 32, '2xl': 40, '3xl': 48, display: 64 },
  stroke: { thin: 1, regular: 1.5, medium: 1.75, bold: 2 },
} as const;

const tokens = {
  color,
  typography,
  spacing,
  touchTarget,
  radius,
  focusRing,
  shadow,
  blur,
  motion,
  breakpoint,
  container,
  layout,
  zIndex,
  icon,
};

export default tokens;
