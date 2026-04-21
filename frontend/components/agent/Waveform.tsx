"use client";

const DELAYS  = ["0s","0.1s","0.2s","0.3s","0.2s","0.1s","0.15s"];
const HEIGHTS = [8,16,24,12,28,16,10];

export function Waveform({ isActive }: { isActive: boolean }) {
  return (
    <div aria-hidden="true" style={{ display:"flex", alignItems:"center", gap:4, height:40 }}>
      {HEIGHTS.map((h, i) => (
        <div key={i} style={{
          width:3, height: isActive ? undefined : h,
          minHeight: isActive ? 4  : undefined,
          maxHeight: isActive ? 32 : undefined,
          borderRadius:2,
          backgroundColor: isActive ? "var(--brand)" : "var(--muted)",
          opacity: isActive ? 1 : 0.4,
          transition:"all 0.2s",
          animation: isActive ? `wave-dance 0.6s ease-in-out ${DELAYS[i]} infinite` : "none",
        }} />
      ))}
    </div>
  );
}
