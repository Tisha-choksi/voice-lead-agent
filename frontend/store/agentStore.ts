"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  AgentStatus,
  LeadScore,
  Message,
  QualificationData,
} from "@/lib/types";

const generateId = (): string =>
  typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface AgentState {
  messages: Message[];
  sessionId: string | null;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  leadScore: LeadScore;
  qualificationData: QualificationData | null;
  status: AgentStatus;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  setSessionId: (id: string) => void;
  setLeadScore: (score: LeadScore) => void;
  setQualificationData: (data: QualificationData) => void;
  setStatus: (status: AgentStatus) => void;
  addToHistory: (role: "user" | "assistant", content: string) => void;
  resetSession: () => void;
}

const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "system",
  content: "Session ready. Click the orb or press Start Talking.",
  timestamp: new Date(),
};

export const useAgentStore = create<AgentState>()(
  devtools(
    (set) => ({
      messages: [INITIAL_MESSAGE],
      sessionId: null,
      conversationHistory: [],
      leadScore: "COLD",
      qualificationData: null,
      status: "idle",

      addMessage: (message) =>
        set(
          (state) => ({
            messages: [
              ...state.messages,
              { ...message, id: generateId(), timestamp: new Date() },
            ],
          }),
          false,
          "addMessage"
        ),

      setSessionId: (id) => set({ sessionId: id }, false, "setSessionId"),

      setLeadScore: (score) => set({ leadScore: score }, false, "setLeadScore"),

      setQualificationData: (data) =>
        set({ qualificationData: data }, false, "setQualificationData"),

      setStatus: (status) => set({ status }, false, "setStatus"),

      addToHistory: (role, content) =>
        set(
          (state) => ({
            conversationHistory: [
              ...state.conversationHistory,
              { role, content },
            ],
          }),
          false,
          "addToHistory"
        ),

      resetSession: () =>
        set(
          {
            messages: [
              {
                id: generateId(),
                role: "system",
                content: "New session started. Click the orb to begin.",
                timestamp: new Date(),
              },
            ],
            sessionId: null,
            conversationHistory: [],
            leadScore: "COLD",
            qualificationData: null,
            status: "idle",
          },
          false,
          "resetSession"
        ),
    }),
    { name: "AriaAgentStore" }
  )
);

// Selector hooks — each component only re-renders when its slice changes
export const useAgentStatus = () => useAgentStore((s) => s.status);
export const useMessages = () => useAgentStore((s) => s.messages);
export const useLeadScore = () => useAgentStore((s) => s.leadScore);
export const useQualificationData = () => useAgentStore((s) => s.qualificationData);
export const useSessionId = () => useAgentStore((s) => s.sessionId);
export const useConversationHistory = () => useAgentStore((s) => s.conversationHistory);