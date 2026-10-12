import type { Config } from "tailwindcss";

// Maps Tailwind to the design-system tokens in app/globals.css (design/prototype-design-system).
const v = (n: string) => `var(--pk-${n})`;

const config: Config = {
  darkMode: ["selector", '[data-pk-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        hover: v("hover"),
        surface: { DEFAULT: v("surface"), 2: v("surface-2") },
        line: { DEFAULT: v("border"), strong: v("border-strong") },
        ink: { DEFAULT: v("text"), 2: v("text-2"), 3: v("text-3") },
        primary: {
          DEFAULT: v("primary"),
          hover: v("primary-hover"),
          fg: v("primary-fg"),
          soft: v("primary-soft"),
          "soft-fg": v("primary-soft-fg"),
        },
        amber: { DEFAULT: v("amber"), soft: v("amber-soft"), fg: v("amber-fg") },
        emerald: { DEFAULT: v("emerald"), soft: v("emerald-soft"), fg: v("emerald-fg") },
        rose: { DEFAULT: v("rose"), soft: v("rose-soft"), fg: v("rose-fg") },
        focus: v("focus"),
        inverse: { DEFAULT: v("inverse"), fg: v("inverse-fg") },
        skeleton: v("skeleton"),
        chart2: v("chart-2"),
        side: {
          bg: v("side-bg"),
          hover: v("side-hover"),
          active: v("side-active"),
          text: v("side-text"),
          muted: v("side-muted"),
          line: v("side-border"),
          accent: v("side-accent"),
        },
      },
      fontFamily: { sans: [v("sans")], mono: [v("mono")] },
      fontSize: {
        xs: ["11.5px", "16px"],
        sm: ["12.5px", "18px"],
        base: ["13px", "19px"],
        lg: ["14px", "20px"],
        xl: ["16px", "22px"],
        "2xl": ["22px", "28px"],
        "3xl": ["24px", "30px"],
      },
      borderRadius: { sm: "4px", DEFAULT: "6px", lg: "10px", xl: "12px" },
      boxShadow: { 1: v("shadow-1"), 2: v("shadow-2"), 3: v("shadow-3") },
      height: { row: "40px", control: "32px", touch: "44px" },
      keyframes: {
        pkPulse: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".45" } },
        pkIn: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        pkSlide: { from: { opacity: "0", transform: "translateX(32px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        pulse: "pkPulse 1.4s ease-in-out infinite",
        in: "pkIn .16s ease-out",
        slide: "pkSlide .18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
