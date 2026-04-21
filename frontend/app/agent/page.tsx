"use client";

import { useVoiceAgent }     from "@/hooks/useVoiceAgent";
import { useAgentStatus, useMessages, useLeadScore, useQualificationData } from "@/store/agentStore";
import { AriaOrb }           from "@/components/agent/AriaOrb";
import { Waveform }           from "@/components/agent/Waveform";
import { MicButton }          from "@/components/agent/MicButton";
import { ChatPanel }          from "@/components/agent/ChatPanel";
import { QualificationStrip } from "@/components/agent/QualificationStrip";

export default function AgentPage() {
  const { isListening, isSpeaking, isStreaming, isSupported, startListening, stopListening, sendTextMessage, resetSession } = useVoiceAgent();
  const status   = useAgentStatus();
  const messages = useMessages();
  const leadScore = useLeadScore();
  const qualData  = useQualificationData();

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:32, fontWeight:800, letterSpacing:"-0.03em", margin:0 }}>
            <span className="gradient-text">Aria</span>{" "}
            <span style={{ color:"var(--text)" }}>Voice Agent</span>
          </h1>
          <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>
            Sarvam AI · Edge TTS Neural Voice · SSE Streaming
          </p>
        </div>
        <button onClick={resetSession}
          style={{ padding:"6px 14px", borderRadius:8, border:"1px solid var(--border)",
            background:"var(--surface)", color:"var(--muted)", fontSize:12,
            cursor:"pointer", fontFamily:"var(--font-body)" }}>
          ↺ New Session
        </button>
      </div>

      {/* 2-column grid */}
      <div style={{ display:"grid", gap:20, gridTemplateColumns:"1fr 380px" }}>

        {/* LEFT — Orb + controls */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:28, background:"var(--card)",
          border:"1px solid var(--border)", borderRadius:20,
          padding:"40px 24px", minHeight:480 }}>
          <AriaOrb status={status} onClick={() => isListening ? stopListening() : startListening()} />
          <Waveform isActive={isListening} />
          <MicButton status={status} isSupported={isSupported}
            onStartListening={startListening} onStopListening={stopListening}
            onSendText={sendTextMessage} />
        </div>

        {/* RIGHT — Chat */}
        <ChatPanel messages={messages} status={status} leadScore={leadScore} isStreaming={isStreaming} />
      </div>

      {/* Qualification strip */}
      <div style={{ marginTop:20 }}>
        <QualificationStrip data={qualData} />
      </div>
    </div>
  );
}
