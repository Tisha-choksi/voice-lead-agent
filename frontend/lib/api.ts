// ─────────────────────────────────────────────────────────────────
// FILE PATH: voice-lead-agent/frontend/lib/api.ts
//
// WHY THIS FILE EXISTS:
//   This is the ONLY place in the entire frontend that knows the
//   backend URL and how to call it. Every component and hook that
//   needs data calls a function from here — never fetch() directly.
//
//   Benefits:
//   ✓ Change the backend URL in ONE place (via env var) not 20 files
//   ✓ All error handling lives here, not scattered across components
//   ✓ Easy to mock for testing — just replace this file
//   ✓ TypeScript ensures the response matches your type definitions
//   ✓ Add auth headers / logging / retry logic here once, applies everywhere
// ─────────────────────────────────────────────────────────────────

import type {
    ChatRequest,
    ChatResponse,
    Lead,
    LeadsResponse,
    LeadStats,
    ApiError,
} from "./types";


// ── BASE URL ──────────────────────────────────────────────────────
//
// Reads from .env.local → NEXT_PUBLIC_API_URL
//
// WHY process.env and not a hardcoded string:
//   Local dev:   http://localhost:8000   (your machine)
//   Production:  https://your-app.onrender.com  (Render.com)
//
//   With an env var, you change ONE line in Vercel's dashboard
//   to point to production. No code change. No redeployment of secrets.
//
// The || fallback means: if the env var isn't set, default to localhost.
// This prevents crashes during accidental misconfiguration.
const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:8000";

// Remove trailing slash to avoid double-slash in URLs like:
//   http://localhost:8000//api/chat  ← bad
//   http://localhost:8000/api/chat   ← good


// ── HELPER: Generic fetch wrapper ─────────────────────────────────
//
// WHY a wrapper instead of calling fetch() directly:
//   Every API call needs the same boilerplate:
//   - Set Content-Type header
//   - Check if response.ok
//   - Parse the JSON body
//   - Handle errors consistently
//
//   This function does all of that once. The functions below just
//   call apiFetch() with their specific path and options.
//
// Generic <T>: The caller tells us what type to expect back.
//   apiFetch<ChatResponse>(...)  →  TypeScript knows the return type
//   apiFetch<LeadsResponse>(...) →  different return type, same function
async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${BASE_URL}${path}`;

    const response = await fetch(url, {
        // Default headers — can be overridden by options
        headers: {
            "Content-Type": "application/json",
            // Future: add Authorization header here for auth
            // "Authorization": `Bearer ${getToken()}`
            ...options.headers,
        },
        ...options,
    });

    // response.ok is true for 200-299 status codes.
    // For 400, 422, 500 etc., FastAPI returns { detail: "..." }
    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // Try to parse FastAPI's error format: { "detail": "..." }
        try {
            const errorBody: ApiError = await response.json();
            errorMessage = errorBody.detail || errorMessage;
        } catch {
            // If the body isn't valid JSON, just use the HTTP status message
        }

        // Throw so the calling function's catch block handles it
        throw new Error(errorMessage);
    }

    // Parse and return the JSON body, typed as T
    return response.json() as Promise<T>;
}


// ── FUNCTION 1: chatWithAgent ─────────────────────────────────────
//
// Sends the user's message to the backend and gets Aria's reply.
//
// Called by: useVoiceAgent hook (Phase 5)
//
// Flow:
//   User speaks → STT converts to text → this function sends to backend
//   → backend calls Groq → Groq generates reply + qualification data
//   → this function returns ChatResponse → hook feeds text to TTS
//
// Parameters:
//   message:             What the user just said
//   sessionId:           Null on first message, UUID on subsequent ones
//   conversationHistory: Last 10 messages for LLM context
export async function chatWithAgent(
    message: string,
    sessionId: string | null,
    conversationHistory: ChatRequest["conversation_history"]
): Promise<ChatResponse> {
    const body: ChatRequest = {
        message,
        session_id: sessionId,
        // Cap at last 10 messages to control token usage on the free Groq tier.
        // 10 messages × ~50 tokens each = ~500 tokens of context, well within limits.
        conversation_history: conversationHistory.slice(-10),
    };

    return apiFetch<ChatResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
    });
}


// ── FUNCTION 2: getLeads ──────────────────────────────────────────
//
// Fetches all leads stored in the SQLite database.
//
// Called by: useLeads hook → LeadsTable component (Phase 6)
//
// Returns an array of Lead objects with their qualification data,
// scores, timestamps, and session IDs.
export async function getLeads(): Promise<LeadsResponse> {
    return apiFetch<LeadsResponse>("/api/leads");
}


// ── FUNCTION 3: getLeadStats ──────────────────────────────────────
//
// Fetches aggregated stats: total, hot count, warm count, cold count.
//
// Called by: useLeads hook → StatsGrid component (Phase 6)
//
// Shown as the 4 stat cards at the top of the dashboard.
export async function getLeadStats(): Promise<LeadStats> {
    return apiFetch<LeadStats>("/api/leads/stats");
}


// ── FUNCTION 4: deleteLead ────────────────────────────────────────
//
// Deletes a lead and its conversation history by session ID.
//
// Called by: LeadsTable component's delete button (Phase 6)
//
// Returns void — after deleting, the dashboard refetches the list.
export async function deleteLead(sessionId: string): Promise<void> {
    await apiFetch<void>(`/api/leads/${sessionId}`, {
        method: "DELETE",
    });
}


// ── FUNCTION 5: checkBackendHealth ───────────────────────────────
//
// Pings the backend root endpoint to check if it's online.
//
// Called by: layout.tsx or the Config panel on load
//
// The backend's GET / returns: { "status": "AI Voice Lead Agent is running 🎙️" }
// If this throws, the backend is offline → show a warning to the user.
export async function checkBackendHealth(): Promise<boolean> {
    try {
        await apiFetch<{ status: string }>("/");
        return true;
    } catch {
        // Don't throw — just return false so the UI shows a warning
        return false;
    }
}


// ── FUNCTION 6: exportLeadsCSV ────────────────────────────────────
//
// Converts leads to CSV format and triggers a browser download.
// This is a pure client-side function — no backend call needed.
//
// Called by: Dashboard "Export CSV" button (Phase 6, optional)
//
// WHY here and not in the component:
//   It transforms Lead[] data → this belongs in the data layer, not UI.
export function exportLeadsCSV(leads: Lead[]): void {
    const headers = [
        "Session ID",
        "Lead Score",
        "Intent",
        "Budget",
        "Timeline",
        "Created At",
    ];

    const rows = leads.map((lead) => {
        // qualification_data can be object or string (backend sends JSON string sometimes)
        const qd =
            typeof lead.qualification_data === "string"
                ? JSON.parse(lead.qualification_data || "{}")
                : lead.qualification_data || {};

        return [
            lead.session_id,
            lead.lead_score,
            qd.intent || "—",
            qd.budget || "—",
            qd.timeline || "—",
            lead.created_at,
        ]
            .map((val) => `"${String(val).replace(/"/g, '""')}"`) // Escape quotes in CSV
            .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and click it — triggers browser download
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up memory
}