// FILE PATH: voice-lead-agent/frontend/components/agent/ChatPanel.tsx
//
// WHY THIS FILE EXISTS:
//   Renders the conversation between the user and Aria as chat bubbles.
//   Shows a typing indicator while Aria is processing (status = "thinking").
//   Auto-scrolls to the bottom as new messages arrive.

"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import type { AgentStatus } from "@/lib/types";
import { LeadScoreBadge } from "@/components/ui/Badge";
import type { LeadScore } from "@/lib/types";

interface ChatPanelProps {
    messages: Message[];
    status: AgentStatus;
    leadScore: LeadScore;
}

export function ChatPanel({ messages, status, leadScore }: ChatPanelProps) {
    // Auto-scroll ref — points to an invisible div at the bottom of the list
    const bottomRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom whenever messages change or status changes
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, status]);

    return (
        <div
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                height: 480,
            }}
            role="log"
            aria-label="Conversation with Aria"
            aria-live="polite"
        >

            {/* ── Panel header ─────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
                style={{ borderColor: "var(--border)" }}
            >
                <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                    Conversation
                </span>
                <LeadScoreBadge score={leadScore} pulse={leadScore === "HOT"} />
            </div>

            {/* ── Message list ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                ))}

                {/* Typing indicator — shown while thinking */}
                {status === "thinking" && <TypingIndicator />}

                {/* Invisible scroll anchor */}
                <div ref={bottomRef} aria-hidden="true" />
            </div>
        </div>
    );
}

// ── ChatBubble ──────────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
    if (message.role === "system") {
        return (
            <div className="flex justify-center">
                <span
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                        background: "rgba(108,99,255,0.08)",
                        color: "var(--text-muted)",
                        border: "1px solid rgba(108,99,255,0.15)",
                    }}
                >
                    {message.content}
                </span>
            </div>
        );
    }

    const isUser = message.role === "user";

    return (
        <div
            className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}
        >
            <div
                className="max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={
                    isUser
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
                        }
                }
            >
                {!isUser && (
                    <span
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "var(--brand-light)", fontFamily: "var(--font-display)" }}
                    >
                        Aria
                    </span>
                )}
                {message.content}
            </div>
        </div>
    );
}

// ── TypingIndicator ─────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="flex justify-start animate-slide-up">
            <div
                className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderBottomLeftRadius: 4,
                }}
                aria-label="Aria is thinking"
            >
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{
                            background: "var(--text-muted)",
                            animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}