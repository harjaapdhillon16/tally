import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          lighter: "hsl(var(--muted-lighter))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          background: "hsl(var(--destructive-background))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          background: "hsl(var(--success-background))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          background: "hsl(var(--warning-background))",
        },
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Category colors
        revenue: {
          bg: "hsl(var(--revenue-bg))",
          fg: "hsl(var(--revenue-fg))",
        },
        cogs: {
          bg: "hsl(var(--cogs-bg))",
          fg: "hsl(var(--cogs-fg))",
        },
        opex: {
          bg: "hsl(var(--opex-bg))",
          fg: "hsl(var(--opex-fg))",
        },
        // Confidence colors
        "confidence-high": {
          bg: "hsl(var(--confidence-high-bg))",
          fg: "hsl(var(--confidence-high-fg))",
        },
        "confidence-medium": {
          bg: "hsl(var(--confidence-medium-bg))",
          fg: "hsl(var(--confidence-medium-fg))",
        },
        "confidence-low": {
          bg: "hsl(var(--confidence-low-bg))",
          fg: "hsl(var(--confidence-low-fg))",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-xl)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      fontSize: {
        tiny: ["0.6875rem", { lineHeight: "1.4" }],
      },
      boxShadow: {
        "notion-sm": "0 1px 2px rgba(15, 15, 15, 0.03)",
        "notion-md": "0 1px 3px rgba(15, 15, 15, 0.06)",
        "notion-lg": "0 2px 8px rgba(15, 15, 15, 0.08)",
        "notion-xl": "0 3px 12px rgba(15, 15, 15, 0.1)",
        "notion-hover": "0 4px 16px rgba(15, 15, 15, 0.12)",
      },
      transitionDuration: {
        "150": "150ms",
      },
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
