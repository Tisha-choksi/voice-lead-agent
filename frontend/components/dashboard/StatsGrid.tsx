"use client";

import type { LeadStats } from "@/lib/types";

interface StatsGridProps {
    stats: LeadStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
    const cards = [
        { label: "Total Leads", value: stats.total, color: "var(--brand-light)", bg: "rgba(108,99,255,0.08)" },
        { label: "🔥 Hot", value: stats.hot, color: "var(--hot)", bg: "rgba(255,77,109,0.08)" },
        { label: "🌤️ Warm", value: stats.warm, color: "var(--warm)", bg: "rgba(255,209,102,0.08)" },
        { label: "❄️ Cold", value: stats.cold, color: "var(--cold)", bg: "rgba(6,214,160,0.08)" },
    ];

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
            }}
        >
            {cards.map((card) => (
                <div
                    key={card.label}
                    style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        padding: 20,
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Subtle colored background glow */}
                    <div
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            top: 0, right: 0,
                            width: 80, height: 80,
                            borderRadius: "50%",
                            background: card.bg,
                            transform: "translate(20px, -20px)",
                            pointerEvents: "none",
                        }}
                    />

                    <p
                        style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            margin: "0 0 10px 0",
                            fontFamily: "var(--font-body)",
                        }}
                    >
                        {card.label}
                    </p>
                    <p
                        style={{
                            fontSize: 40,
                            fontWeight: 800,
                            fontFamily: "var(--font-display)",
                            color: card.color,
                            margin: 0,
                            letterSpacing: "-0.04em",
                            lineHeight: 1,
                        }}
                    >
                        {card.value}
                    </p>
                </div>
            ))}
        </div>
    );
}