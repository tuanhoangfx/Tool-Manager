import type { Config } from "tailwindcss";

/** P0008 hub + P0019 Infi Todo (animations from P0019 index.html tailwind.config) */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeOutUp: {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(-20px)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideOutRight: {
          "0%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(100%)" },
        },
        numberFlip: {
          "0%": { opacity: "0", transform: "translateY(0.5em)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "background-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        breathingGlow: {
          "0%, 100%": { boxShadow: "0 0 15px 5px var(--breathing-glow-color)" },
          "50%": { boxShadow: "0 0 30px 10px var(--breathing-glow-color-strong)" },
        },
        breathingGlowRed: {
          "0%, 100%": { borderColor: "rgba(239, 68, 68, 0.6)" },
          "50%": { borderColor: "rgba(239, 68, 68, 1)" },
        },
        "press-down": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        shake: {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        "gentle-shake": {
          "0%, 20%, 100%": { transform: "translateX(0)" },
          "2%, 6%, 10%, 14%, 18%": { transform: "translateX(-1px)" },
          "4%, 8%, 12%, 16%": { transform: "translateX(1px)" },
        },
        "highlight-update": {
          "0%, 100%": { boxShadow: "inset 0 0 0 0px var(--accent-color)" },
          "50%": { boxShadow: "inset 0 0 0 3px var(--accent-color)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out forwards",
        fadeInUp: "fadeInUp 0.3s ease-out forwards",
        fadeInDown: "fadeInDown 0.3s ease-out forwards",
        fadeOutUp: "fadeOutUp 0.3s ease-in forwards",
        slideInRight: "slideInRight 0.3s ease-out forwards",
        slideOutRight: "slideOutRight 0.3s ease-out forwards",
        numberFlip: "numberFlip 0.3s ease-out forwards",
        "background-pan": "background-pan 15s ease infinite",
        breathingGlow: "breathingGlow 5s ease-in-out infinite",
        breathingGlowRed: "breathingGlowRed 3s ease-in-out infinite",
        "press-down": "press-down 0.2s ease-in-out",
        "progress-fill": "progress-fill 8s ease-in-out infinite alternate",
        shake: "shake 0.82s cubic-bezier(.36,.07,.19,.97) both",
        "gentle-shake": "gentle-shake 5s cubic-bezier(.36,.07,.19,.97) infinite",
        "highlight-update": "highlight-update 1.5s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
