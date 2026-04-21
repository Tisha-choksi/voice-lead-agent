"use client";

import { useEffect, useRef } from "react";
import type { AgentStatus, LeadScore, Message } from "@/lib/types";
import { LeadScoreBadge } from "@/components/ui/Badge";

export function ChatPanel({ messages, status, leadScore, isStreaming }: {
  messages:    Message[];
  status:      AgentStatus;
  leadScore:   LeadScore;
  isStreaming?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  return (
    <div role="log" aria-label="Conversation" aria-live="polite"
      style={{ display:"flex", flexDirection:"column", background:"var(--card)",
        border:"1px solid var(--border)", borderRadius:20, height:480, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 16px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <span style={{ fontFamily:"var(--font-display)", fontSize:13, fontWeight:700, color:"var(--text)" }}>
          Conversation
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {isStreaming && (
            <span style={{ fontSize:10, color:"var(--brand-light)", fontWeight:600,
              textTransform:"uppercase", letterSpacing:"0.08em" }}>
              ● LIVE
            </span>
          )}
          <LeadScoreBadge score={leadScore} pulse={leadScore==="HOT"} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10 }}>
        {messages.map((msg) => <Bubble key={msg.id} message={msg} />)}
        {status === "thinking" && !isStreaming && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.role === "system") {
    return (
      <div style={{ display:"flex", justifyContent:"center" }}>
        <span style={{ fontSize:11, padding:"3px 12px", borderRadius:999,
          background:"rgba(108,99,255,0.08)", border:"1px solid rgba(108,99,255,0.15)",
          color:"var(--muted)" }}>
          {message.content}
        </span>
      </div>
    );
  }

  const isUser = message.role === "user";
  const isEmpty = message.content === "" && !isUser;

  return (
    <div className="animate-slide-up" style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth:"88%", padding:"10px 14px", borderRadius:16, fontSize:13, lineHeight:1.55,
        ...(isUser
          ? { background:"linear-gradient(135deg,var(--brand),var(--brand-light))", color:"white", borderBottomRightRadius:4 }
          : { background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)", borderBottomLeftRadius:4 }) }}>

        {!isUser && (
          <span style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--brand-light)",
            marginBottom:3, fontFamily:"var(--font-display)" }}>Aria</span>
        )}

        {isEmpty ? (
          // Streaming cursor shown while waiting for first token
          <span style={{ display:"inline-block", width:8, height:14, background:"var(--brand-light)",
            borderRadius:2, animation:"blink 1s ease-in-out infinite", verticalAlign:"middle" }} />
        ) : (
          <>
            {message.content}
            {/* Blinking cursor while this aria bubble is being streamed */}
            {!isUser && message.content.length > 0 && message.content.slice(-1) !== "." && (
              <span style={{ display:"inline-block", width:2, height:13, background:"var(--brand-light)",
                borderRadius:1, marginLeft:2, animation:"blink 0.8s ease-in-out infinite", verticalAlign:"middle" }} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="animate-slide-up" style={{ display:"flex", justifyContent:"flex-start" }}>
      <div aria-label="Aria is thinking"
        style={{ padding:"10px 14px", borderRadius:16, borderBottomLeftRadius:4,
          background:"var(--surface)", border:"1px solid var(--border)",
          display:"flex", alignItems:"center", gap:5 }}>
        {[0,1,2].map((i) => (
          <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"var(--muted)",
            animation:`typing-bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}
