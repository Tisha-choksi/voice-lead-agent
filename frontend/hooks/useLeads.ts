"use client";

import { useState, useEffect, useCallback } from "react";
import { getLeads, getLeadStats, deleteLead, exportLeadsCSV } from "@/lib/api";
import type { Lead, LeadStats } from "@/lib/types";

export function useLeads() {
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [stats,   setStats]   = useState<LeadStats>({ total:0, hot:0, warm:0, cold:0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [l, s] = await Promise.all([getLeads(), getLeadStats()]);
      setLeads(l.leads);
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot reach backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleDelete = useCallback(async (sessionId: string) => {
    try {
      await deleteLead(sessionId);
      setLeads((prev) => prev.filter((l) => l.session_id !== sessionId));
      setStats((prev) => {
        const d = leads.find((l) => l.session_id === sessionId);
        if (!d) return prev;
        return {
          ...prev, total: prev.total - 1,
          hot:  d.lead_score === "HOT"  ? prev.hot  - 1 : prev.hot,
          warm: d.lead_score === "WARM" ? prev.warm - 1 : prev.warm,
          cold: d.lead_score === "COLD" ? prev.cold - 1 : prev.cold,
        };
      });
    } catch (e) { alert(e instanceof Error ? e.message : "Failed to delete."); }
  }, [leads]);

  const handleExport = useCallback(() => {
    if (!leads.length) { alert("No leads to export yet."); return; }
    exportLeadsCSV(leads);
  }, [leads]);

  return { leads, stats, loading, error, refresh, handleDelete, handleExport };
}
