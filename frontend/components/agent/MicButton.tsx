// FILE PATH: voice-lead-agent/frontend/components/agent/MicButton.tsx
//
// WHY THIS FILE EXISTS:
//   The primary call-to-action button for the voice agent.
//   Changes label, color, and style based on the agent's current status.
//   Also renders a text input fallback for unsupported browsers.

"use client";

import type { AgentStatus } from "@/lib/types";
import { useState } from "react";

interface MicButtonProps {
  status: AgentStatus;
  isSupported: boolean;          // Web Speech API supported?
  onStartListening: () => void;
  onStopListening: () => void;
  onSendText: (text: string) => void; // Text input fallback
}

export function MicButton({
  status,
  isSupported,
  onStartListening,
  onStopListening,
  onSendText,
}: MicButtonProps) {
  const [textInput, setTextInput] = useState("");

  const isListening = status === "listening";
  const isDisabled = status === "thinking" || status === "speaking";

  // ── Button label and style per status ────────────────────────
  const buttonConfig = {
    idle:      { label: "🎙️  Start Talking",  bg: "var(--brand)",    shadow: "rgba(108,99,255,0.4)" },
    listening: { label: "⏹  Stop",            bg: "var(--hot)",      shadow: "rgba(255,77,109,0.4)" },
    thinking:  { label: "⏳  Processing...",   bg: "var(--text-muted)", shadow: "transparent" },
    speaking:  { label: "🔊  Speaking...",     bg: "var(--cold)",     shadow: "rgba(6,214,160,0.3)" },
  }[status];

  const handleMicClick = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    onSendText(textInput.trim());
    setTextInput("");
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">

      {/* ── Main mic button ────────────────────────────────────── */}
      {isSupported && (
        <button
          onClick={handleMicClick}
          disabled={isDisabled}
          className="w-full py-3.5 px-8 rounded-full font-bold text-sm tracking-wide text-white transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
          style={{
            fontFamily: "var(--font-display)",
            background: `linear-gradient(135deg, ${buttonConfig.bg}, ${buttonConfig.bg}dd)`,
            boxShadow: `0 4px 20px ${buttonConfig.shadow}`,
            animation: isListening ? "pulse-glow 1.5s ease-in-out infinite" : "none",
          }}
          aria-pressed={isListening}
          aria-label={buttonConfig.label}
        >
          {buttonConfig.label}
        </button>
      )}

      {/* ── Text input fallback ────────────────────────────────── */}
      {/* Shown when mic is unsupported, or always as an alternative */}
      <div className="flex w-full gap-2">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleTextSend();
            }
          }}
          placeholder={
            isSupported
              ? "Or type here..."
              : "Voice not supported — type here"
          }
          disabled={isDisabled}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none transition-colors disabled:opacity-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
          }}
          aria-label="Type your message to Aria"
        />
        <button
          onClick={handleTextSend}
          disabled={isDisabled || !textInput.trim()}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
          style={{
            background: "var(--brand)",
            color: "white",
          }}
          aria-label="Send message"
        >
          →
        </button>
      </div>

      {/* ── Browser support warning ─────────────────────────────── */}
      {!isSupported && (
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Voice input requires Chrome or Edge. Use the text box above.
        </p>
      )}
    </div>
  );
}