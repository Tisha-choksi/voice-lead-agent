"use client";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useAgentStatus, useMessages, useLeadScore, useQualificationData } from "@/store/agentStore";
import { AriaOrb } from "@/components/agent/AriaOrb";
import { Waveform } from "@/components/agent/Waveform";
import { MicButton } from "@/components/agent/MicButton";
import { ChatPanel } from "@/components/agent/ChatPanel";
import { QualificationStrip } from "@/components/agent/QualificationStrip";

export default function AgentPage() {
    const { isListening, isSpeaking, isSupported, startListening, stopListening, sendTextMessage, resetSession } = useVoiceAgent();
    const status = useAgentStatus();
    const messages = useMessages();
    const leadScore = useLeadScore();
    const qualData = useQualificationData();

    const handleOrbClick = () => isListening ? stopListening() : startListening();

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
            <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
                        <span className="gradient-text">Aria</span>{" "}
                        <span style={{ color: "var(--text-primary)" }}>Voice Agent</span>
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>AI-powered lead qualification · Groq LLaMA-3 · Free tier</p>
                </div>
                <button onClick={resetSession} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)" }}>↺ New Session</button>
            </div>

            <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr 380px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: "40px 24px", minHeight: 480 }}>
                    <AriaOrb status={status} onClick={handleOrbClick} />
                    <Waveform isActive={isListening} />
                    <MicButton status={status} isSupported={isSupported} onStartListening={startListening} onStopListening={stopListening} onSendText={sendTextMessage} />
                </div>
                <ChatPanel messages={messages} status={status} leadScore={leadScore} />
            </div>

            <div style={{ marginTop: 20 }}>
                <QualificationStrip data={qualData} />
            </div>
        </div>
    );
}