"use client";

import { useLeads }    from "@/hooks/useLeads";
import { StatsGrid }   from "@/components/dashboard/StatsGrid";
import { LeadsTable }  from "@/components/dashboard/LeadsTable";

export default function DashboardPage() {
  const { leads, stats, loading, error, refresh, handleDelete, handleExport } = useLeads();

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:32, fontWeight:800, letterSpacing:"-0.03em", margin:0 }}>
            <span className="gradient-text">Lead</span>{" "}
            <span style={{ color:"var(--text)" }}>Dashboard</span>
          </h1>
          <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>All captured leads · auto-refreshes every 30s</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={handleExport} style={{ padding:"7px 16px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--muted)", fontSize:12, cursor:"pointer" }}>↓ Export CSV</button>
          <button onClick={refresh}      style={{ padding:"7px 16px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--muted)", fontSize:12, cursor:"pointer" }}>⟳ Refresh</button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:"rgba(255,77,109,0.08)", border:"1px solid rgba(255,77,109,0.25)",
          borderRadius:12, padding:"12px 16px", marginBottom:20, fontSize:13, color:"var(--hot)" }}>
          ❌ {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ marginBottom:24 }}><StatsGrid stats={stats} /></div>

      {/* Table */}
      <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:20, overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"14px 20px", borderBottom:"1px solid var(--border)" }}>
          <span style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:700, color:"var(--text)" }}>All Leads</span>
          <span style={{ fontSize:12, color:"var(--muted)" }}>{stats.total} total</span>
        </div>
        <LeadsTable leads={leads} loading={loading} onDelete={handleDelete} />
      </div>
    </div>
  );
}
