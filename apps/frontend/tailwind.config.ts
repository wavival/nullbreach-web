import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "480px",
      md: "640px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "12px",
        md: "16px",
        lg: "24px",
      },
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#22C55E",
          foreground: "#0F172A",
          hover: "#16A34A",
          active: "#15803D",
        },
        secondary: {
          DEFAULT: "#3B82F6",
          foreground: "#F1F5F9",
          hover: "#2563EB",
          active: "#1D4ED8",
        },
        tertiary: {
          DEFAULT: "#FF8B7C",
          foreground: "#F1F5F9",
          hover: "#FF6B5B",
          active: "#E74C3C",
        },
        neutral: "#71796F",
        surface: {
          DEFAULT: "#0F172A",
          alt: "#1E293B",
        },
        foreground: {
          DEFAULT: "#F1F5F9",
          muted: "#94A3B8",
        },
        border: "#334155",
        success: "#22C55E",
        error: "#FF8B7C",
        warning: "#FBBF24",
        info: "#3B82F6",
        disabled: "#CBD5E1",
        // severity (vulnerability item)
        severity: {
          critical: "#FF8B7C",
          high: "#FBBF24",
          medium: "#3B82F6",
          low: "#22C55E",
        },
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
        "4xl": "64px",
        navbar: "64px",
        sidebar: "280px",
      },
      borderRadius: {
        none: "0",
        DEFAULT: "4px",
        sm: "4px",
        md: "4px",
        lg: "4px",
        xl: "4px",
        full: "9999px",
      },
      boxShadow: {
        subtle: "0 2px 4px rgba(0, 0, 0, 0.2)",
        base: "0 4px 6px rgba(0, 0, 0, 0.3)",
        medium: "0 8px 12px rgba(0, 0, 0, 0.4)",
        large: "0 12px 24px rgba(0, 0, 0, 0.5)",
        xl: "0 20px 40px rgba(0, 0, 0, 0.6)",
      },
      fontFamily: {
        headline: ['"Geist"', '"Inter"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        h1: [
          "32px",
          { lineHeight: "1.2", letterSpacing: "-0.5px", fontWeight: "700" },
        ],
        h2: [
          "28px",
          { lineHeight: "1.2", letterSpacing: "-0.3px", fontWeight: "700" },
        ],
        h3: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        h4: ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        label: [
          "12px",
          { lineHeight: "1.4", letterSpacing: "0.5px", fontWeight: "500" },
        ],
        code: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      transitionDuration: {
        hover: "150ms",
        click: "100ms",
        modal: "200ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        hover: "cubic-bezier(0, 0, 0.2, 1)", // ease-out
        click: "cubic-bezier(0, 0, 0.2, 1)",
        modal: "cubic-bezier(0, 0, 0.2, 1)",
        slow: "cubic-bezier(0.4, 0, 0.2, 1)", // ease-in-out
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "card-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(0, -2px)" },
        },
        "float-lg": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "33%": { transform: "translate(2px, -3px)" },
          "66%": { transform: "translate(-2px, 2px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.35)" },
          "50%": { boxShadow: "0 0 0 8px rgba(34, 197, 94, 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "fade-in-up": "fade-in-up 300ms ease-out both",
        "slide-down": "slide-down 200ms ease-out both",
        "card-in": "card-in 300ms ease-out both",
        float: "float 6s ease-in-out infinite",
        "float-lg": "float-lg 12s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
