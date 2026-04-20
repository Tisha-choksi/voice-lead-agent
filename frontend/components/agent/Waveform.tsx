// FILE PATH: voice-lead-agent/frontend/components/agent/Waveform.tsx
//
// WHY THIS FILE EXISTS:
//   Visual feedback that the microphone is actively listening.
//   7 bars that animate up and down with staggered delays,
//   creating the classic audio waveform effect.
//   Static (no animation) when not listening.

"use client";

interface WaveformProps {
  isActive: boolean; // Animate when true (listening), static when false
}

// Heights for each bar in idle state (varied for visual interest)
const IDLE_HEIGHTS = [8, 16, 24, 12, 28, 16, 10];

// Animation delay for each bar (staggered for wave effect)
const ANIMATION_DELAYS = ["0s", "0.1s", "0.2s", "0.3s", "0.2s", "0.1s", "0.15s"];

export function Waveform({ isActive }: WaveformProps) {
  return (
    <div
      className="flex items-center justify-center gap-1"
      style={{ height: 40 }}
      aria-hidden="true" // Decorative — screen readers don't need this
    >
      {IDLE_HEIGHTS.map((idleHeight, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-200"
          style={{
            width: 3,
            height: isActive ? undefined : idleHeight,
            backgroundColor: isActive
              ? "var(--brand)"
              : "var(--text-muted)",
            opacity: isActive ? 1 : 0.4,
            // CSS animation only runs when isActive = true
            animation: isActive
              ? `wave-dance 0.6s ease-in-out ${ANIMATION_DELAYS[i]} infinite`
              : "none",
            // When not active, use the fixed idle height
            minHeight: isActive ? 4 : undefined,
            maxHeight: isActive ? 32 : undefined,
          }}
        />
      ))}
    </div>
  );
}