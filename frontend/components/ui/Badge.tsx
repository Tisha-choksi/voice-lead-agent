"use client";

import type { LeadScore } from "@/lib/types";

// ── LeadScoreBadge ─────────────────────────────────────────────

const SCORE_STYLES: Record<LeadScore, { bg: string; color: string }> = {
    HOT: { bg: "rgba(255,77,109,0.12)", color: "var(--hot)" },
    WARM: { bg: "rgba(255,209,102,0.12)", color: "var(--warm)" },
    COLD: { bg: "rgba(6,214,160,0.12)", color: "var(--cold)" },
};

export function LeadScoreBadge({
    score,
    pulse = false,
    size = "sm",
}: {
    score: LeadScore;
    pulse?: boolean;
    size?: "sm" | "md";
}) {
    const s = SCORE_STYLES[score];
    const pad = size === "md" ? "4px 12px" : "2px 10px";
    const fs = size === "md" ? 12 : 11;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: pad,
                borderRadius: 6,
                fontSize: fs,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                backgroundColor: s.bg,
                color: s.color,
            }}
        >
            {pulse && score === "HOT" && (
                <span
                    style={{
                        width: 6, height: 6,
                        borderRadius: "50%",
                        backgroundColor: s.color,
                        display: "inline-block",
                        animation: "pulse-glow 1s ease-in-out infinite",
                    }}
                />
            )}
            {score}
        </span>
    );
}

// ── Badge (generic) ────────────────────────────────────────────

type Variant = "default" | "info" | "success" | "warning" | "danger";

const VARIANT_STYLES: Record<Variant, { bg: string; color: string }> = {
    default: { bg: "rgba(255,255,255,0.06)", color: "var(--text-muted)" },
    info: { bg: "rgba(108,99,255,0.12)", color: "var(--brand-light)" },
    success: { bg: "rgba(6,214,160,0.12)", color: "var(--cold)" },
    warning: { bg: "rgba(255,209,102,0.12)", color: "var(--warm)" },
    danger: { bg: "rgba(255,77,109,0.12)", color: "var(--hot)" },
};

export function Badge({
    children,
    variant = "default",
}: {
    children: React.ReactNode;
    variant?: Variant;
}) {
    const s = VARIANT_STYLES[variant];
    return (
        <span
            style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: s.bg,
                color: s.color,
            }}
        >
            {children}
        </span>
    );
}

// ── ConversationStageBadge ─────────────────────────────────────

type Stage = "greeting" | "discovery" | "qualification" | "closing";

const STAGE_MAP: Record<Stage, { label: string; variant: Variant }> = {
    greeting: { label: "Greeting", variant: "default" },
    discovery: { label: "Discovery", variant: "info" },
    qualification: { label: "Qualifying", variant: "warning" },
    closing: { label: "Closing", variant: "success" },
};

export function ConversationStageBadge({ stage }: { stage: Stage }) {
    const cfg = STAGE_MAP[stage] ?? STAGE_MAP.greeting;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}