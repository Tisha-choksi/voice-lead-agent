// FILE PATH: voice-lead-agent/frontend/components/agent/AriaOrb.tsx
//
// WHY THIS FILE EXISTS:
//   The orb is the visual heart of the voice agent — Aria's "face".
//   It communicates the agent's current state through animation:
//
//   idle      → soft glow, gentle breathing pulse
//   listening → fast pulse rings, mic icon, user is speaking
//   thinking  → rotating spinner ring, processing icon
//   speaking  → orbit rings rotating, sound waves, Aria is talking
//
//   All animation states are driven by the `status` prop from Zustand.
//   The component itself has no logic — pure visual display.

"use client";

import type { AgentStatus } from "@/lib/types";

interface AriaOrbProps {
  status: AgentStatus;
  onClick: () => void; // Click orb = toggle listening
}

// ── Status configuration ────────────────────────────────────────
// Maps each status to its display properties
// Defined outside component to avoid recreation on every render
const STATUS_CONFIG = {
  idle: {
    emoji: "🎙️",
    label: "Click to speak",
    ringOpacity: "0",
    ringAnimation: "",
    orbAnimation: "",
    glowColor: "rgba(108, 99, 255, 0.3)",
  },
  listening: {
    emoji: "👂",
    label: "Listening...",
    ringOpacity: "1",
    ringAnimation: "animate-pulse",
    orbAnimation: "animate-pulse",
    glowColor: "rgba(108, 99, 255, 0.7)",
  },
  thinking: {
    emoji: "🤔",
    label: "Thinking...",
    ringOpacity: "0.6",
    ringAnimation: "animate-spin",
    orbAnimation: "",
    glowColor: "rgba(255, 209, 102, 0.4)",
  },
  speaking: {
    emoji: "💬",
    label: "Aria is speaking",
    ringOpacity: "1",
    ringAnimation: "animate-orbit",
    orbAnimation: "",
    glowColor: "rgba(6, 214, 160, 0.4)",
  },
} satisfies Record<AgentStatus, object>;

export function AriaOrb({ status, onClick }: AriaOrbProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col items-center gap-6">

      {/* ── Orb wrapper with orbit rings ────────────────────── */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 200, height: 200 }}
      >

        {/* Outer orbit ring — visible when listening or speaking */}
        <div
          className={`absolute rounded-full border transition-opacity duration-500 ${config.ringAnimation}`}
          style={{
            width: 200,
            height: 200,
            borderColor: "rgba(108,99,255,0.2)",
            opacity: config.ringOpacity,
          }}
          aria-hidden="true"
        />

        {/* Middle orbit ring */}
        <div
          className={`absolute rounded-full border transition-opacity duration-500`}
          style={{
            width: 165,
            height: 165,
            borderColor: "rgba(108,99,255,0.3)",
            opacity: config.ringOpacity,
            animation: status === "speaking"
              ? "orbit 2s linear infinite reverse"
              : status === "listening"
              ? "pulse 1s ease-in-out infinite"
              : "none",
          }}
          aria-hidden="true"
        />

        {/* ── Main clickable orb ──────────────────────────────── */}
        <button
          onClick={onClick}
          className={`
            relative z-10 w-36 h-36 rounded-full
            flex items-center justify-center
            text-5xl cursor-pointer
            transition-all duration-300
            focus:outline-none focus-visible:ring-4
            focus-visible:ring-purple-500 focus-visible:ring-offset-2
            focus-visible:ring-offset-transparent
            active:scale-95
            hover:scale-105
          `}
          style={{
            background: "linear-gradient(135deg, #8b85ff, #6c63ff 60%, #4a43cc)",
            boxShadow: `0 0 40px ${config.glowColor}, 0 0 80px ${config.glowColor}`,
            animation: status === "listening"
              ? "pulse-glow 0.8s ease-in-out infinite"
              : "none",
          }}
          aria-label={
            status === "idle"
              ? "Click to start talking to Aria"
              : status === "listening"
              ? "Aria is listening — click to stop"
              : status === "speaking"
              ? "Aria is speaking"
              : "Aria is thinking"
          }
          // Disable click while thinking or speaking
          disabled={status === "thinking" || status === "speaking"}
        >
          {/* Status emoji / icon */}
          <span
            style={{ fontSize: 44 }}
            aria-hidden="true"
          >
            {config.emoji}
          </span>

          {/* Thinking spinner overlay */}
          {status === "thinking" && (
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
              style={{
                borderTopColor: "rgba(255, 209, 102, 0.8)",
                borderRightColor: "rgba(255, 209, 102, 0.3)",
              }}
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {/* ── Status text ─────────────────────────────────────────── */}
      <div className="text-center">
        <p
          className="text-base font-semibold tracking-tight transition-all duration-300"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          {status === "idle" && "Hello! I'm Aria"}
          {status === "listening" && "Listening..."}
          {status === "thinking" && "Processing..."}
          {status === "speaking" && "Aria is speaking"}
        </p>
        <p
          className="text-sm mt-1 transition-all duration-300"
          style={{ color: "var(--text-muted)" }}
        >
          {config.label}
        </p>
      </div>
    </div>
  );
}