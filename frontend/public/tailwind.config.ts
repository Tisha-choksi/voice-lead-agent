import type { Config } from "tailwindcss";

const config: Config = {
    // Tells Tailwind WHERE to look for class names.
    // It scans these files and generates only the CSS classes actually used.
    // If you forget a path here, classes in that file will vanish in production.
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],

    theme: {
        extend: {
            // ── Custom color palette ──────────────────────────────
            // These let you write classes like bg-brand, text-hot, border-warm
            // instead of hardcoding hex values in every component.
            colors: {
                brand: {
                    DEFAULT: "#6c63ff",
                    light: "#9b94ff",
                    dark: "#4a43cc",
                },
                surface: {
                    DEFAULT: "#111118",
                    card: "#16161f",
                    border: "#1f1f2e",
                },
                lead: {
                    hot: "#ff4d6d",
                    warm: "#ffd166",
                    cold: "#06d6a0",
                },
            },

            // ── Custom fonts ──────────────────────────────────────
            // Loaded via Google Fonts in layout.tsx.
            // Usage: font-display (headings), font-body (paragraphs)
            fontFamily: {
                display: ["Syne", "sans-serif"],
                body: ["DM Sans", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },

            // ── Custom animations ─────────────────────────────────
            // Used by AriaOrb, Waveform, and MicButton components.
            // Define here once, use everywhere as animate-pulse-glow etc.
            keyframes: {
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(108,99,255,0.3)" },
                    "50%": { boxShadow: "0 0 60px rgba(108,99,255,0.7)" },
                },
                "wave-dance": {
                    "0%, 100%": { height: "4px" },
                    "50%": { height: "28px" },
                },
                orbit: {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                },
                "slide-up": {
                    from: { opacity: "0", transform: "translateY(8px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
                "wave-dance": "wave-dance 0.6s ease-in-out infinite",
                orbit: "orbit 3s linear infinite",
                "slide-up": "slide-up 0.3s ease forwards",
            },
        },
    },

    plugins: [],
};

export default config;