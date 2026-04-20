"use client";

import { useEffect, useRef } from "react";
import type { AgentStatus, LeadScore, Message } from "@/lib/types";
import { LeadScoreBadge } from "@/components/ui/Badge";

interface ChatPanelProps {
    messages: Message[];
    status: AgentStatus;
    leadScore: LeadScore;
}

export function ChatPanel({ messages, status, leadScore }: ChatPanelProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, status]);

    return (
        <div
            role="log"
            aria-label="Conversation with Aria"
            aria-live="polite"
            style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                height: 480,
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    flexShrink: 0,
                }}
            >
                <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    Conversation
                </span>
                <LeadScoreBadge score={leadScore} pulse={leadScore === "HOT"} />
            </div>

            {/* Messages */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                }}
            >
                {messages.map((msg) => (
                    <Bubble key={msg.id} message={msg} />
                ))}

                {status === "thinking" && <TypingIndicator />}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function Bubble({ message }: { message: Message }) {
    if (message.role === "system") {
        return (
            <div style={{ display: "flex", justifyContent: "center" }}>
                <span style={{
                    fontSize: 11, padding: "3px 12px", borderRadius: 999,
                    background: "rgba(108,99,255,0.08)",
                    border: "1px solid rgba(108,99,255,0.15)",
                    color: "var(--text-muted)",
                }}>
                    {message.content}
                </span>
            </div>
        );
    }

    const isUser = message.role === "user";

    return (
        <div
            className="animate-slide-up"
            style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}
        >
            <div
                style={{
                    maxWidth: "88%",
                    padding: "10px 14px",
                    borderRadius: 16,
                    fontSize: 13,
                    lineHeight: 1.55,
                    ...(isUser
                        ? {
                            background: "linear-gradient(135deg, var(--brand), var(--brand-light))",
                            color: "white",
                            borderBottomRightRadius: 4,
                        }
                        : {
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                            borderBottomLeftRadius: 4,
                        }),
                }}
            >
                {!isUser && (
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--brand-light)", marginBottom: 3, fontFamily: "var(--font-display)" }}>
                        Aria
                    </span>
                )}
                {message.content}
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="animate-slide-up" style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
                aria-label="Aria is thinking"
                style={{
                    padding: "10px 14px",
                    borderRadius: 16,
                    borderBottomLeftRadius: 4,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                }}
            >
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        style={{
                            width: 7, height: 7,
                            borderRadius: "50%",
                            background: "var(--text-muted)",
                            animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}