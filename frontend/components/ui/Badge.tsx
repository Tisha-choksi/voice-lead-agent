// FILE PATH: voice-lead-agent/frontend/components/ui/Badge.tsx
//
// WHY THIS FILE EXISTS:
//   Provides a color-coded badge that visually indicates lead temperature
//   (HOT / WARM / COLD). Optionally pulses to draw attention to hot leads.

"use client";

import type { LeadScore } from "@/lib/types";

/* ── colour map per score ─────────────────────────────────────────── */
const SCORE_STYLES: Record<
    LeadScore,
    { bg: string; text: string; border: string; glow: string }
> = {
    HOT: {
        bg: "rgba(255, 59, 48, 0.12)",
        text: "#ff453a",
        border: "rgba(255, 59, 48, 0.30)",
        glow: "0 0 8px rgba(255, 59, 48, 0.35)",
    },
    WARM: {
        bg: "rgba(255, 179, 64, 0.12)",
        text: "#ffb340",
        border: "rgba(255, 179, 64, 0.30)",
        glow: "0 0 8px rgba(255, 179, 64, 0.25)",
    },
    COLD: {
        bg: "rgba(100, 210, 255, 0.10)",
        text: "#64d2ff",
        border: "rgba(100, 210, 255, 0.25)",
        glow: "none",
    },
};

/* ── component ────────────────────────────────────────────────────── */
interface LeadScoreBadgeProps {
    score: LeadScore;
    /** When true the badge gently pulses (used for HOT leads). */
    pulse?: boolean;
}

export function LeadScoreBadge({ score, pulse = false }: LeadScoreBadgeProps) {
    const s = SCORE_STYLES[score];

    return (
        <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full select-none"
            style={{
                background: s.bg,
                color: s.text,
                border: `1px solid ${s.border}`,
                boxShadow: s.glow,
                fontFamily: "var(--font-display)",
                letterSpacing: "0.04em",
                animation: pulse ? "badgePulse 2s ease-in-out infinite" : "none",
            }}
        >
            {/* small coloured dot */}
            <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: s.text }}
            />
            {score}
        </span>
    );
}
