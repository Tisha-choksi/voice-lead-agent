import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand:   { DEFAULT: "#6c63ff", light: "#9b94ff", dark: "#4a43cc" },
        surface: { DEFAULT: "#111118", card: "#16161f", border: "#1f1f2e" },
        lead:    { hot: "#ff4d6d", warm: "#ffd166", cold: "#06d6a0" },
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body:    ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
