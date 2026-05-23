"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getLeads, getLeadStats, deleteLead, exportLeadsCSV } from "@/lib/api";
import type { Lead, LeadStats } from "@/lib/types";

export function useLeads() {
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [stats,   setStats]   = useState<LeadStats>({ total:0, hot:0, warm:0, cold:0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [l, s] = await Promise.all([getLeads(), getLeadStats()]);
      if (!mountedRef.current) return;
      setLeads(l.leads);
      setStats(s);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Cannot reach backend.");
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => { mountedRef.current = false; clearInterval(t); };
  }, [refresh]);

  const handleDelete = useCallback(async (sessionId: string) => {
    try {
      await deleteLead(sessionId);
      const d = leadsRef.current.find((l) => l.session_id === sessionId);
      setLeads((prev) => prev.filter((l) => l.session_id !== sessionId));
      if (d) {
        setStats((prev) => ({
          ...prev, total: Math.max(0, prev.total - 1),
          hot:  d.lead_score === "HOT"  ? Math.max(0, prev.hot  - 1) : prev.hot,
          warm: d.lead_score === "WARM" ? Math.max(0, prev.warm - 1) : prev.warm,
          cold: d.lead_score === "COLD" ? Math.max(0, prev.cold - 1) : prev.cold,
        }));
      }
    } catch (e) { alert(e instanceof Error ? e.message : "Failed to delete."); }
  }, []);

  const handleExport = useCallback(() => {
    if (!leads.length) { alert("No leads to export yet."); return; }
    exportLeadsCSV(leads);
  }, [leads]);

  return { leads, stats, loading, error, refresh, handleDelete, handleExport };
}
