"use client";

import type { Lead, LeadScore } from "@/lib/types";
import { LeadScoreBadge } from "@/components/ui/Badge";

export function LeadsTable({ leads, loading, onDelete }: {
  leads:    Lead[];
  loading:  boolean;
  onDelete: (sessionId: string) => void;
}) {
  if (loading) return (
    <div style={{ padding:48, textAlign:"center", color:"var(--muted)", fontSize:13 }}>Loading leads...</div>
  );

  if (!leads.length) return (
    <div style={{ padding:64, textAlign:"center" }}>
      <p style={{ fontSize:32, marginBottom:10 }}>🎙️</p>
      <p style={{ color:"var(--text)", fontWeight:600, fontSize:15, margin:"0 0 6px 0", fontFamily:"var(--font-display)" }}>No leads yet</p>
      <p style={{ color:"var(--muted)", fontSize:13 }}>Start a voice conversation on the Agent page.</p>
    </div>
  );

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>
            {["Score","First Message","Intent","Budget","Timeline","Date",""].map((col) => (
              <th key={col} style={{ padding:"9px 20px", textAlign:"left", fontSize:11,
                color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em",
                borderBottom:"1px solid var(--border)", fontWeight:500, whiteSpace:"nowrap" }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => <LeadRow key={lead.session_id} lead={lead} onDelete={() => onDelete(lead.session_id)} />)}
        </tbody>
      </table>
    </div>
  );
}

function LeadRow({ lead, onDelete }: { lead: Lead; onDelete: () => void }) {
  const qd = typeof lead.qualification_data === "string"
    ? (() => { try { return JSON.parse(lead.qualification_data as string); } catch { return {}; } })()
    : lead.qualification_data ?? {};

  const intent   = qd?.intent   && qd.intent   !== "unknown" ? qd.intent   : "—";
  const budget   = qd?.budget   && qd.budget   !== "unknown" ? qd.budget   : "—";
  const timeline = qd?.timeline && qd.timeline !== "unknown" ? qd.timeline : "—";
  const date     = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
    : "—";
  const firstMsg = lead.first_message?.length > 50
    ? lead.first_message.slice(0,50)+"..." : lead.first_message ?? "—";

  const tdStyle = (muted=false) => ({
    padding:"12px 20px", fontSize:13,
    color: muted ? "var(--muted)" : "var(--text)",
    borderBottom:"1px solid rgba(31,31,46,0.6)",
    whiteSpace:"nowrap" as const, maxWidth:180,
    overflow:"hidden", textOverflow:"ellipsis",
  });

  return (
    <tr onMouseEnter={(e)=>(e.currentTarget.style.background="rgba(255,255,255,0.02)")}
        onMouseLeave={(e)=>(e.currentTarget.style.background="transparent")}
        style={{ transition:"background 0.15s" }}>
      <td style={tdStyle()}><LeadScoreBadge score={lead.lead_score as LeadScore} pulse={lead.lead_score==="HOT"} /></td>
      <td style={tdStyle(true)}>{firstMsg}</td>
      <td style={tdStyle(true)}>{intent}</td>
      <td style={tdStyle(true)}>{budget}</td>
      <td style={tdStyle(true)}>{timeline}</td>
      <td style={tdStyle(true)}>{date}</td>
      <td style={{ padding:"12px 20px", borderBottom:"1px solid rgba(31,31,46,0.6)" }}>
        <button onClick={onDelete} title="Delete"
          style={{ background:"transparent", border:"1px solid rgba(255,77,109,0.2)",
            borderRadius:6, color:"rgba(255,77,109,0.6)", fontSize:12,
            padding:"3px 10px", cursor:"pointer", transition:"all 0.15s" }}
          onMouseEnter={(e)=>{ (e.currentTarget as HTMLElement).style.background="rgba(255,77,109,0.1)"; (e.currentTarget as HTMLElement).style.color="var(--hot)"; }}
          onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color="rgba(255,77,109,0.6)"; }}>
          Delete
        </button>
      </td>
    </tr>
  );
}
