// FILE PATH: voice-lead-agent/frontend/app/agent/page.tsx
//
// WHY THIS FILE EXISTS:
//   This is the main page of the entire app — what users see at /agent.
//   It assembles all the components and hooks into the final UI.
//
//   This page has ONE job: layout.
//   All logic lives in useVoiceAgent() hook.
//   All state lives in useAgentStore() Zustand store.
//   All visuals live in the components.
//   This page just wires them together.
//
// "use client" is required because:
//   - We use hooks (useState, useEffect, custom hooks)
//   - We use browser APIs (Web Speech API via hooks)
//   - Next.js defaults to Server Components — client must be explicit

"use client";

import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import {
  useAgentStatus,
  useMessages,
  useLeadScore,
  useQualificationData,
} from "@/store/agentStore";

import { AriaOrb } from "@/components/agent/AriaOrb";
import { Waveform } from "@/components/agent/Waveform";
import { MicButton } from "@/components/agent/MicButton";
import { ChatPanel } from "@/components/agent/ChatPanel";
import { QualificationStrip } from "@/components/agent/QualificationStrip";

// ── Page metadata (used by layout.tsx template) ─────────────────
import type { Metadata } from "next";
// Note: metadata export only works in Server Components.
// For Client Components, set title via document.title or use a parent layout.
// The layout.tsx default title "Aria Voice Agent" will be used here.

export default function AgentPage() {

  // ── Hook: voice agent pipeline ─────────────────────────────────
  // All voice logic — STT, API call, TTS — comes from here
  const {
    isListening,
    isSpeaking,
    isSupported,
    startListening,
    stopListening,
    sendTextMessage,
    resetSession,
  } = useVoiceAgent();

  // ── Store: read global state ────────────────────────────────────
  // Each selector hook only re-renders THIS component when its slice changes
  const status         = useAgentStatus();
  const messages       = useMessages();
  const leadScore      = useLeadScore();
  const qualData       = useQualificationData();

  // ── Orb click handler ──────────────────────────────────────────
  // Toggle mic on/off when orb or mic button is clicked
  const handleOrbClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div
      className="max-w-6xl mx-auto px-4 py-8"
      aria-label="Aria voice agent interface"
    >

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="gradient-text">Aria</span>
            <span style={{ color: "var(--text-primary)" }}> Voice Agent</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            AI-powered lead qualification · Groq LLaMA-3 · Free tier
          </p>
        </div>

        {/* New Session button */}
        <button
          onClick={resetSession}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-body)",
          }}
          aria-label="Start a new conversation session"
        >
          ↺ New Session
        </button>
      </div>

      {/* ── Main 2-column grid ──────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">

        {/* ── LEFT: Aria orb + controls ──────────────────────────── */}
        <div
          className="flex flex-col items-center justify-center gap-8 rounded-2xl py-10 px-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            minHeight: 480,
          }}
        >
          {/* Animated orb — click to start/stop listening */}
          <AriaOrb
            status={status}
            onClick={handleOrbClick}
          />

          {/* Waveform — animates when mic is active */}
          <Waveform isActive={isListening} />

          {/* Mic button + text input fallback */}
          <MicButton
            status={status}
            isSupported={isSupported}
            onStartListening={startListening}
            onStopListening={stopListening}
            onSendText={sendTextMessage}
          />
        </div>

        {/* ── RIGHT: Conversation chat panel ─────────────────────── */}
        <ChatPanel
          messages={messages}
          status={status}
          leadScore={leadScore}
        />
      </div>

      {/* ── Bottom: Live qualification strip ────────────────────── */}
      <div className="mt-5">
        <QualificationStrip data={qualData} />
      </div>

    </div>
  );
}