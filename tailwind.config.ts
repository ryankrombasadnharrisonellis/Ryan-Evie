import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        rose: "rgb(var(--rose) / <alpha-value>)",
        peach: "rgb(var(--peach) / <alpha-value>)",
        sky: "rgb(var(--sky) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-rounded", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-rounded", "system-ui", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        soft: "0 8px 30px -12px rgb(var(--shadow) / 0.25)",
      },
      keyframes: {
        floatUp: {
          "0%": { transform: "translateY(0) scale(0.6)", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { transform: "translateY(-180px) scale(1.1)", opacity: "0" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(0.92)" },
          "70%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        floatUp: "floatUp 1.6s ease-out forwards",
        pop: "pop 0.45s ease-out",
        fadeIn: "fadeIn 0.4s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
