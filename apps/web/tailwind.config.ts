import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AgriLens palette
        al: {
          bg:      "var(--al-bg)",
          card:    "var(--al-card)",
          border:  "var(--al-border)",
          text:    "var(--al-text)",
          sec:     "var(--al-sec)",
          muted:   "var(--al-muted)",
          accent:  "var(--al-accent)",
          hover:   "var(--al-hover)",
          navy:    "#0F0E47",
          dark:    "#272757",
          mid:     "#505081",
          soft:    "#8686AC",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "leaf-float": {
          "0%":   { transform: "translateY(110vh) translateX(0px) rotate(0deg)",   opacity: "0" },
          "5%":   { opacity: "0.5" },
          "95%":  { opacity: "0.3" },
          "100%": { transform: "translateY(-10vh) translateX(var(--drift))",        opacity: "0" },
        },
        "leaf-sway": {
          "0%, 100%": { transform: "rotate(-8deg)" },
          "50%":      { transform: "rotate(8deg)" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
      },
      animation: {
        "leaf-float":  "leaf-float var(--duration, 12s) ease-in-out infinite",
        "leaf-sway":   "leaf-sway 3s ease-in-out infinite",
        "fade-up":     "fade-up 0.6s ease-out forwards",
        "pulse-soft":  "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
