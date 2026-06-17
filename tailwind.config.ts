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
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '24px',
      },
    },
  },
  plugins: [],
};
export default config;
