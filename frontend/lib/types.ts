// ─────────────────────────────────────────────────────────────────
// FILE PATH: voice-lead-agent/frontend/lib/types.ts
//
// WHY THIS FILE EXISTS:
//   This is the single source of truth for ALL data shapes in the app.
//   Every component, hook, and API function imports types from here.
//
//   Without this file you'd have:
//   - Types scattered across every component (leads to inconsistency)
//   - No guarantee your API response matches what the UI expects
//   - Duplicate type definitions that drift out of sync
//
//   With this file:
//   - Change a type once → TypeScript highlights every broken usage
//   - New team member reads this file → understands the full data model
// ─────────────────────────────────────────────────────────────────


// ── 1. LEAD SCORING ───────────────────────────────────────────────
//
// WHY A UNION TYPE (not a string):
//   If you write  leadScore: string  →  any value is valid: "hot", "Hot", "HOT", "typo"
//   If you write  leadScore: LeadScore  →  ONLY "HOT" | "WARM" | "COLD" are valid
//   TypeScript will show a red error the moment you mistype it.
//
// Used by: ChatResponse, Lead, LeadsTableRow, Badge component
export type LeadScore = "HOT" | "WARM" | "COLD";


// ── 2. CONVERSATION STAGE ─────────────────────────────────────────
//
// Tracks WHERE in the sales conversation Aria currently is.
// The backend extracts this from the LLM response and sends it back.
// The frontend uses it to show contextual UI hints.
//
// Flow: greeting → discovery → qualification → closing
export type ConversationStage =
    | "greeting"
    | "discovery"
    | "qualification"
    | "closing";


// ── 3. CHAT MESSAGE ───────────────────────────────────────────────
//
// Represents a single bubble in the conversation thread.
//
// role:
//   "user"   → what the human said (shown on the right, purple bubble)
//   "aria"   → what Aria said (shown on the left, dark bubble)
//   "system" → status messages like "Session started" (centered, small)
//
// id: used as React key in the message list. Always unique.
// timestamp: shown as "2 min ago" or "10:34 AM" in the chat UI.
export interface Message {
    id: string;
    role: "user" | "aria" | "system";
    content: string;
    timestamp: Date;
}


// ── 4. QUALIFICATION DATA ─────────────────────────────────────────
//
// The structured data the LLM extracts during the conversation.
// Aria's system prompt instructs it to append this JSON after every reply.
// The backend parses it and sends it back in ChatResponse.
//
// These fields are shown in the Qualification Strip below the voice UI:
//   [ Intent ]  [ Budget ]  [ Timeline ]  [ Stage ]
//
// "unknown" is the default — it becomes a real value as the
// conversation progresses and the lead reveals more information.
export interface QualificationData {
    intent: string;           // e.g. "Looking to buy 10 diamonds for resale"
    budget: string;           // e.g. "$50,000" or "unknown"
    timeline: string;         // e.g. "within 1 month" or "unknown"
    is_decision_maker: boolean | "unknown";
    lead_score: LeadScore;
    conversation_stage: ConversationStage;
}


// ── 5. CHAT REQUEST ───────────────────────────────────────────────
//
// What the frontend sends TO the backend on every message.
// Maps directly to the Pydantic ChatRequest model in backend/app/models.py
//
// session_id:
//   Null on the very first message of a new conversation.
//   The backend creates one and returns it in ChatResponse.
//   The frontend stores it in Zustand and sends it back on every
//   subsequent message so the backend can track the same lead.
//
// conversation_history:
//   LLMs have no memory between API calls — each call is stateless.
//   We send the last N messages so the LLM knows what was said before.
//   We cap it at 10 messages to keep the token count (and cost) low.
export interface ChatRequest {
    message: string;
    session_id: string | null;
    conversation_history: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
}


// ── 6. CHAT RESPONSE ─────────────────────────────────────────────
//
// What the backend returns FROM the backend after processing a message.
// Maps directly to the Pydantic ChatResponse model in backend/app/models.py
//
// reply:     Aria's spoken response (sent to TTS, shown in chat)
// session_id: The UUID for this lead's session (store this in Zustand)
// lead_score: HOT / WARM / COLD (shown in the badge above chat panel)
// qualification_data: Full breakdown (shown in qualification strip)
// conversation_stage: Current stage (greeting/discovery/etc.)
export interface ChatResponse {
    reply: string;
    session_id: string;
    lead_score: LeadScore;
    qualification_data: QualificationData;
    conversation_stage: ConversationStage;
}


// ── 7. LEAD (database record) ─────────────────────────────────────
//
// A lead as stored in SQLite and returned by GET /api/leads
// Shown as a row in the Lead Dashboard table.
//
// qualification_data here is the FINAL state after the conversation ended.
// It may be a parsed object (from JSON.parse) or still a string if
// the backend hasn't parsed it — handle both in the dashboard.
export interface Lead {
    id: number;
    session_id: string;
    first_message: string;
    name: string;
    phone: string | null;
    email: string | null;
    lead_score: LeadScore;
    qualification_data: QualificationData | string | null;
    created_at: string;   // ISO date string: "2024-01-15T10:30:00"
    updated_at: string;
}


// ── 8. LEADS API RESPONSE ─────────────────────────────────────────
//
// Shape of GET /api/leads response from the backend.
export interface LeadsResponse {
    leads: Lead[];
    total: number;
}


// ── 9. LEAD STATS ─────────────────────────────────────────────────
//
// Shape of GET /api/leads/stats response.
// Used by the StatsGrid component in the dashboard.
export interface LeadStats {
    total: number;
    hot: number;
    warm: number;
    cold: number;
}


// ── 10. VOICE AGENT STATE ─────────────────────────────────────────
//
// The shape of the global Zustand store (defined in store/agentStore.ts).
// Defining it here as a type keeps the store file clean.
// You'll use this type when you create the store in Phase 4.
//
// AgentStatus drives the AriaOrb animation:
//   idle      → orb is static, mic button says "Start Talking"
//   listening → orb pulses, waveform animates, mic button says "Stop"
//   thinking  → orb shows ?, typing indicator in chat
//   speaking  → orb animates, TTS is playing
export type AgentStatus = "idle" | "listening" | "thinking" | "speaking";

export interface AgentStore {
    // Conversation state
    messages: Message[];
    sessionId: string | null;
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;

    // Lead qualification state
    leadScore: LeadScore;
    qualificationData: QualificationData | null;

    // Voice agent status
    status: AgentStatus;

    // Actions (functions that update state)
    addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
    setSessionId: (id: string) => void;
    setLeadScore: (score: LeadScore) => void;
    setQualificationData: (data: QualificationData) => void;
    setStatus: (status: AgentStatus) => void;
    resetSession: () => void;
}


// ── 11. API ERROR ─────────────────────────────────────────────────
//
// When the backend returns an error (4xx or 5xx), FastAPI sends:
//   { "detail": "Error message here" }
// This type lets you handle errors with proper TypeScript typing.
export interface ApiError {
    detail: string;
}