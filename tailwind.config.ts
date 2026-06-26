import type { Config } from "tailwindcss";
import {
  color,
  typography,
  spacing,
  radius,
  shadow,
  blur,
  motion,
  breakpoint,
  container,
  zIndex,
} from "./src/design/tokens";

/**
 * ISOCODELABS Ops Hub — Tailwind theme.
 *
 * The theme is generated from the single source of truth in
 * `src/design/tokens.ts`, which encodes the inherited ISOCODELABS design
 * language (BrandOS). The legacy `apple-*` / `sf-*` token names are preserved
 * but remapped onto ISOCODELABS values, so every existing className across the
 * app adopts the inherited palette without a 200-file rewrite.
 *
 * Cobalt is the only interactive color. Copper (`emphasis`) is reserved for
 * rare craftsmanship moments. See .kiro/steering/design-language.md.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "display-xl": ["72px", { lineHeight: typography.lineHeight.display, letterSpacing: typography.letterSpacing.display }],
        "display-lg": ["60px", { lineHeight: typography.lineHeight.display, letterSpacing: typography.letterSpacing.display }],
        "display-md": ["48px", { lineHeight: typography.lineHeight.display, letterSpacing: typography.letterSpacing.display }],
        "heading-1": ["40px", { lineHeight: typography.lineHeight.heading, letterSpacing: typography.letterSpacing.heading }],
        "heading-2": ["32px", { lineHeight: typography.lineHeight.heading, letterSpacing: typography.letterSpacing.heading }],
        "heading-3": ["28px", { lineHeight: typography.lineHeight.heading, letterSpacing: typography.letterSpacing.heading }],
        "heading-4": ["24px", { lineHeight: typography.lineHeight.heading, letterSpacing: typography.letterSpacing.heading }],
        "heading-5": ["20px", { lineHeight: typography.lineHeight.heading, letterSpacing: typography.letterSpacing.heading }],
        "heading-6": ["18px", { lineHeight: typography.lineHeight.heading }],
        "body-xl": ["20px", { lineHeight: typography.lineHeight.body }],
        "body-lg": ["18px", { lineHeight: typography.lineHeight.body }],
        "body-base": ["16px", { lineHeight: typography.lineHeight.body }],
        "body-sm": ["14px", { lineHeight: typography.lineHeight.compact }],
        caption: ["12px", { lineHeight: typography.lineHeight.compact }],
        micro: ["11px", { lineHeight: typography.lineHeight.compact, letterSpacing: typography.letterSpacing.caps }],
      },
      letterSpacing: {
        display: typography.letterSpacing.display,
        heading: typography.letterSpacing.heading,
        caps: typography.letterSpacing.caps,
      },
      colors: {
        // ── Inherited ISOCODELABS palette (canonical namespaces) ──
        brand: color.brand,
        neutral: color.neutral,
        accent: color.accent,
        emphasis: color.emphasis,
        success: { DEFAULT: color.semantic.success, bg: color.semantic.successBg },
        warning: { DEFAULT: color.semantic.warning, bg: color.semantic.warningBg },
        danger: { DEFAULT: color.semantic.danger, bg: color.semantic.dangerBg },
        info: { DEFAULT: color.semantic.info, bg: color.semantic.infoBg },

        // ── Theme-aware semantic aliases (CSS variables, light/dark) ──
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card-bg)",
        "card-foreground": "var(--foreground)",
        border: "var(--border-color)",
        muted: "var(--surface-muted)",
        "muted-foreground": "var(--text-secondary)",

        // ── Legacy names remapped onto ISOCODELABS tokens ──
        // Preserved so existing classNames inherit the design language.
        // `apple-blue` now resolves to ISOCODELABS cobalt, etc.
        sf: {
          bg: {
            light: color.background.secondary,    // #FAFAF8
            dark: color.neutral[950],             // #0B0D10
            elevatedLight: color.background.primary, // #FFFFFF
            elevatedDark: color.neutral[900],     // #1C1F23
          },
          text: {
            light: color.text.primary,            // #0B0D10
            dark: color.text.inverse,             // #FFFFFF
            secondaryLight: color.text.secondary, // #4B5563
            secondaryDark: color.neutral[500],    // #B7B9BC
          },
          border: {
            light: color.border.default,          // #D9D9D6
            dark: "rgba(255,255,255,0.08)",
          },
        },
        apple: {
          blue: color.accent.blue,        // #2563EB (was Apple blue)
          blueHover: color.accent.blueHover,
          gray: color.background.secondary, // #FAFAF8
          green: color.semantic.success,  // #16A34A
          red: color.semantic.danger,     // #DC2626
          orange: color.semantic.warning, // #D97706
          yellow: "#CA8A04",
        },
      },
      spacing: {
        "2px": spacing["2"],
        "18": "72px",
        "22": "88px",
        // Layout primitives (BrandOS breakpoints.json -> layout)
        sidebar: "280px",
        "sidebar-collapsed": "88px",
        header: "72px",
        "header-mobile": "64px",
      },
      maxWidth: {
        content: "1440px",
        dashboard: container.dashboard, // 1600px
        reading: container.reading,     // 760px
      },
      boxShadow: {
        // ── ISOCODELABS elevation scale (shadows.json) ──
        xs: shadow.xs,
        sm: shadow.sm,
        md: shadow.md,
        lg: shadow.lg,
        xl: shadow.xl,
        button: shadow.button,
        card: shadow.card,
        modal: shadow.modal,
        tooltip: shadow.tooltip,
        floating: shadow.floating,
        glass: shadow.glass,
        // Legacy names -> ISOCODELABS elevation
        "apple-sm": shadow.xs,
        "apple-md": shadow.sm,
        "apple-lg": shadow.card,
        "apple-xl": shadow.lg,
      },
      borderRadius: {
        xs: radius.xs,
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
        "2xl": radius["2xl"],
        pill: radius.pill,
        // Legacy names -> ISOCODELABS radius scale
        apple: radius.md,       // 12px (buttons/inputs)
        "apple-lg": radius.lg,  // 16px (cards)
        "apple-xl": radius.xl,  // 24px (modals)
      },
      transitionTimingFunction: {
        standard: motion.easing.standard,
        enter: motion.easing.enter,
        exit: motion.easing.exit,
        decisive: motion.easing.decisive,
        hero: motion.easing.hero,
      },
      transitionDuration: {
        micro: "80ms",
        fast: "150ms",
        normal: "250ms",
        medium: "350ms",
        slow: "500ms",
      },
      backdropBlur: {
        glass: blur.glass,
      },
      screens: {
        "mobile-lg": breakpoint.mobileLg,
        tablet: breakpoint.tablet,
        "tablet-lg": breakpoint.tabletLg,
        desktop: breakpoint.desktop,
        "desktop-lg": breakpoint.desktopLg,
        "desktop-xl": breakpoint.desktopXL,
      },
      zIndex: {
        sticky: String(zIndex.sticky),
        dropdown: String(zIndex.dropdown),
        overlay: String(zIndex.overlay),
        drawer: String(zIndex.drawer),
        modal: String(zIndex.modal),
        toast: String(zIndex.toast),
        tooltip: String(zIndex.tooltip),
      },
    },
  },
  plugins: [],
};
export default config;
