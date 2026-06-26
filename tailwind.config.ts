import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        // Inherited from the ISOCODELABS Design System (ICLabs-Design-BrandOS).
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // ── ISOCODELABS brand type scale (design/tokens/typography.json) ──
        'display-xl': '72px',
        'display-lg': '60px',
        'display-md': '48px',
        'brand-h1': '40px',
        'brand-h2': '32px',
        'brand-h3': '28px',
        'brand-h4': '24px',
        'brand-h5': '20px',
        'brand-h6': '18px',
        'body-xl': '20px',
        'body-lg': '18px',
        'body-sm': '14px',
        'caption': '12px',
        'micro': '11px',
      },
      colors: {
        sf: {
          bg: {
            light: "#f5f5f7",
            dark: "#000000",
            elevatedLight: "#ffffff",
            elevatedDark: "#1c1c1e",
          },
          text: {
            light: "#1d1d1f",
            dark: "#f5f5f7",
            secondaryLight: "#86868b",
            secondaryDark: "#8e8e93",
          },
          border: {
            light: "#e5e5ea",
            dark: "#2c2c2e",
          },
        },
        apple: {
          blue: "#0071e3",
          blueHover: "#0077ed",
          gray: "#f5f5f7",
          green: "#34c759",
          red: "#ff3b30",
          orange: "#ff9500",
          yellow: "#ffcc00",
        },
        // ──────────────────────────────────────────────────────────────────
        // ISOCODELABS Design System brand tokens.
        // Inherited from ICLabs-Design-BrandOS/design/tokens/colors.json.
        // These should remain synchronized with the source design system and
        // are the canonical tokens that all child products inherit.
        // ──────────────────────────────────────────────────────────────────
        brand: {
          primary: "#0B0D10",
          secondary: "#1C1F23",
          tertiary: "#9CA3A8",
          surface: "#FAFAF8",
          surfaceMuted: "#ECECE8",
          surfaceAlt: "#D9D9D6",
          white: "#FFFFFF",
          black: "#000000",
          cobalt: "#2563EB",
          cobaltHover: "#1D4ED8",
          cobaltActive: "#1E40AF",
          copper: "#B8734A",
          copperHover: "#A9653E",
          copperActive: "#8F5533",
          success: "#16A34A",
          warning: "#D97706",
          danger: "#DC2626",
          info: "#2563EB",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card-bg)",
        border: "var(--border-color)",
      },
      boxShadow: {
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'apple-md': '0 4px 16px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 12px 32px rgba(0, 0, 0, 0.08)',
        'apple-xl': '0 20px 48px rgba(0, 0, 0, 0.12)',
        // ── ISOCODELABS brand elevation (design/tokens/shadows.json) ──
        'brand-xs': '0 1px 2px rgba(11,13,16,0.04)',
        'brand-sm': '0 2px 6px rgba(11,13,16,0.06)',
        'brand-md': '0 8px 24px rgba(11,13,16,0.08)',
        'brand-lg': '0 16px 48px rgba(11,13,16,0.12)',
        'brand-xl': '0 32px 72px rgba(11,13,16,0.16)',
        'brand-card': '0 10px 30px rgba(11,13,16,0.08)',
        'brand-modal': '0 40px 120px rgba(11,13,16,0.22)',
        'brand-floating': '0 20px 60px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '24px',
        // ── ISOCODELABS brand radius scale (design/tokens/radius.json) ──
        'brand-xs': '4px',
        'brand-sm': '8px',
        'brand-md': '12px',
        'brand-lg': '16px',
        'brand-xl': '24px',
        'brand-2xl': '32px',
        'brand-pill': '999px',
      },
    },
  },
  plugins: [],
};
export default config;
