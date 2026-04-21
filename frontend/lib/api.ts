import type { LeadsResponse, LeadStats, Lead, ApiError } from "./types";

const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = ((await res.json()) as ApiError).detail || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function getLeads():     Promise<LeadsResponse> { return apiFetch("/api/leads"); }
export async function getLeadStats(): Promise<LeadStats>     { return apiFetch("/api/leads/stats"); }

export async function deleteLead(sessionId: string): Promise<void> {
  await apiFetch(`/api/leads/${sessionId}`, { method: "DELETE" });
}

export async function checkHealth(): Promise<boolean> {
  try { await apiFetch<{ status: string }>("/"); return true; }
  catch { return false; }
}

export function exportLeadsCSV(leads: Lead[]): void {
  const headers = ["Session ID","Lead Score","Intent","Budget","Timeline","Created At"];
  const rows = leads.map((l) => {
    const qd = typeof l.qualification_data === "string"
      ? (() => { try { return JSON.parse(l.qualification_data as string); } catch { return {}; } })()
      : l.qualification_data ?? {};
    return [l.session_id, l.lead_score, qd?.intent||"—", qd?.budget||"—", qd?.timeline||"—", l.created_at]
      .map((v) => `"${String(v).replace(/"/g,'""')}"`)
      .join(",");
  });
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
