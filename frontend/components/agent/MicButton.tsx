"use client";

import { useState } from "react";
import type { AgentStatus } from "@/lib/types";

const BTN: Record<AgentStatus,{label:string;bg:string}> = {
  idle:      { label:"🎙️  Start Talking", bg:"var(--brand)" },
  listening: { label:"⏹  Stop",           bg:"var(--hot)" },
  thinking:  { label:"⏳  Processing...",  bg:"var(--muted)" },
  speaking:  { label:"🔊  Speaking...",    bg:"var(--cold)" },
};

export function MicButton({ status, isSupported, onStartListening, onStopListening, onSendText }: {
  status:           AgentStatus;
  isSupported:      boolean;
  onStartListening: () => void;
  onStopListening:  () => void;
  onSendText:       (text: string) => void;
}) {
  const [text, setText] = useState("");
  const disabled   = status === "thinking" || status === "speaking";
  const isListening = status === "listening";
  const cfg = BTN[status];

  const send = () => { if (!text.trim()) return; onSendText(text.trim()); setText(""); };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, width:"100%", maxWidth:340 }}>

      {isSupported && (
        <button onClick={isListening ? onStopListening : onStartListening} disabled={disabled}
          style={{ width:"100%", padding:"13px 28px", borderRadius:9999, border:"none",
            cursor: disabled ? "not-allowed" : "pointer",
            background:`linear-gradient(135deg,${cfg.bg},${cfg.bg}cc)`,
            color:"white", fontSize:14, fontWeight:700,
            fontFamily:"var(--font-display)", letterSpacing:"0.03em",
            opacity: disabled ? 0.6 : 1, transition:"transform 0.2s",
            boxShadow: isListening ? "0 4px 20px rgba(255,77,109,0.5)" : "0 4px 20px rgba(108,99,255,0.4)" }}>
          {cfg.label}
        </button>
      )}

      <div style={{ display:"flex", width:"100%", gap:8 }}>
        <input type="text" value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          disabled={disabled}
          placeholder={isSupported ? "Or type here..." : "Voice not supported — type here"}
          style={{ flex:1, padding:"8px 12px", borderRadius:10,
            border:"1px solid var(--border)", background:"var(--surface)",
            color:"var(--text)", fontSize:13, fontFamily:"var(--font-body)",
            outline:"none", opacity: disabled ? 0.5 : 1 }} />
        <button onClick={send} disabled={disabled || !text.trim()}
          style={{ padding:"8px 14px", borderRadius:10, border:"none",
            background:"var(--brand)", color:"white", fontSize:14,
            cursor: disabled||!text.trim() ? "not-allowed" : "pointer",
            opacity: disabled||!text.trim() ? 0.4 : 1 }}>→</button>
      </div>

      {!isSupported && (
        <p style={{ fontSize:11, color:"var(--muted)", textAlign:"center" }}>
          Voice input requires Chrome or Edge.
        </p>
      )}
    </div>
  );
}
