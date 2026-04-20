import type {
  ChatRequest,
  ChatResponse,
  LeadsResponse,
  LeadStats,
  Lead,
  ApiError,
} from "./types";

const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const err: ApiError = await response.json();
      message = err.detail || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function chatWithAgent(
  message: string,
  sessionId: string | null,
  conversationHistory: ChatRequest["conversation_history"]
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      session_id: sessionId,
      conversation_history: conversationHistory.slice(-10),
    }),
  });
}

export async function getLeads(): Promise<LeadsResponse> {
  return apiFetch<LeadsResponse>("/api/leads");
}

export async function getLeadStats(): Promise<LeadStats> {
  return apiFetch<LeadStats>("/api/leads/stats");
}

export async function deleteLead(sessionId: string): Promise<void> {
  await apiFetch<void>(`/api/leads/${sessionId}`, { method: "DELETE" });
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    await apiFetch<{ status: string }>("/");
    return true;
  } catch {
    return false;
  }
}

export function exportLeadsCSV(leads: Lead[]): void {
  const headers = ["Session ID", "Lead Score", "Intent", "Budget", "Timeline", "Created At"];
  const rows = leads.map((lead) => {
    const qd =
      typeof lead.qualification_data === "string"
        ? JSON.parse(lead.qualification_data || "{}")
        : lead.qualification_data || {};
    return [
      lead.session_id, lead.lead_score,
      qd.intent || "—", qd.budget || "—", qd.timeline || "—", lead.created_at,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}