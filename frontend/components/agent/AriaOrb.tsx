"use client";

import type { AgentStatus } from "@/lib/types";

interface AriaOrbProps {
    status: AgentStatus;
    onClick: () => void;
}

const CONFIG: Record<AgentStatus, { emoji: string; glow: string; label: string }> = {
    idle: { emoji: "🎙️", glow: "rgba(108,99,255,0.3)", label: "Click to speak" },
    listening: { emoji: "👂", glow: "rgba(108,99,255,0.7)", label: "Listening..." },
    thinking: { emoji: "🤔", glow: "rgba(255,209,102,0.4)", label: "Processing..." },
    speaking: { emoji: "💬", glow: "rgba(6,214,160,0.4)", label: "Aria is speaking" },
};

export function AriaOrb({ status, onClick }: AriaOrbProps) {
    const cfg = CONFIG[status];
    const isActive = status === "listening" || status === "speaking";
    const isDisabled = status === "thinking" || status === "speaking";

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

            {/* Orb wrapper */}
            <div style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>

                {/* Outer ring */}
                <div
                    style={{
                        position: "absolute",
                        width: 200, height: 200,
                        borderRadius: "50%",
                        border: "1px solid rgba(108,99,255,0.2)",
                        opacity: isActive ? 1 : 0,
                        transition: "opacity 0.5s",
                        animation: status === "speaking" ? "orbit 3s linear infinite" : status === "listening" ? "pulse-glow 1s ease-in-out infinite" : "none",
                    }}
                />

                {/* Middle ring */}
                <div
                    style={{
                        position: "absolute",
                        width: 165, height: 165,
                        borderRadius: "50%",
                        border: "1px solid rgba(108,99,255,0.3)",
                        opacity: isActive ? 1 : 0,
                        transition: "opacity 0.5s",
                        animation: status === "speaking" ? "orbit 2s linear infinite reverse" : "none",
                    }}
                />

                {/* Main orb button */}
                <button
                    onClick={onClick}
                    disabled={isDisabled}
                    aria-label={cfg.label}
                    style={{
                        position: "relative",
                        zIndex: 10,
                        width: 144, height: 144,
                        borderRadius: "50%",
                        border: "none",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        background: "linear-gradient(135deg, #8b85ff, #6c63ff 60%, #4a43cc)",
                        boxShadow: `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 44,
                        transition: "transform 0.2s, box-shadow 0.3s",
                        animation: status === "listening" ? "pulse-glow 0.8s ease-in-out infinite" : "none",
                    }}
                    onMouseEnter={(e) => { if (!isDisabled) (e.currentTarget as HTMLElement).style.transform = "scale(1.06)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                >
                    <span style={{ fontSize: 44, lineHeight: 1 }}>{cfg.emoji}</span>

                    {/* Thinking spinner */}
                    {status === "thinking" && (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                borderRadius: "50%",
                                border: "4px solid transparent",
                                borderTopColor: "rgba(255,209,102,0.8)",
                                borderRightColor: "rgba(255,209,102,0.3)",
                                animation: "spin 1s linear infinite",
                            }}
                        />
                    )}
                </button>
            </div>

            {/* Status text */}
            <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    {status === "idle" && "Hello! I'm Aria"}
                    {status === "listening" && "Listening..."}
                    {status === "thinking" && "Processing..."}
                    {status === "speaking" && "Aria is speaking"}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    {cfg.label}
                </p>
            </div>
        </div>
    );
}