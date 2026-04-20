"use client";

import { useState, useEffect, useCallback } from "react";
import { getLeads, getLeadStats, deleteLead, exportLeadsCSV } from "@/lib/api";
import type { Lead, LeadStats } from "@/lib/types";

interface UseLeadsReturn {
    leads: Lead[];
    stats: LeadStats;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    handleDelete: (sessionId: string) => Promise<void>;
    handleExport: () => void;
}

const DEFAULT_STATS: LeadStats = { total: 0, hot: 0, warm: 0, cold: 0 };

export function useLeads(): UseLeadsReturn {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState<LeadStats>(DEFAULT_STATS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setError(null);
            const [leadsData, statsData] = await Promise.all([
                getLeads(),
                getLeadStats(),
            ]);
            setLeads(leadsData.leads);
            setStats(statsData);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not reach backend. Make sure it is running."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Load on mount + auto-refresh every 30 seconds
    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 30_000);
        return () => clearInterval(interval);
    }, [refresh]);

    const handleDelete = useCallback(
        async (sessionId: string) => {
            try {
                await deleteLead(sessionId);
                // Remove from local state immediately (optimistic update)
                setLeads((prev) => prev.filter((l) => l.session_id !== sessionId));
                // Update stats counts
                setStats((prev) => {
                    const deleted = leads.find((l) => l.session_id === sessionId);
                    if (!deleted) return prev;
                    return {
                        ...prev,
                        total: prev.total - 1,
                        hot: deleted.lead_score === "HOT" ? prev.hot - 1 : prev.hot,
                        warm: deleted.lead_score === "WARM" ? prev.warm - 1 : prev.warm,
                        cold: deleted.lead_score === "COLD" ? prev.cold - 1 : prev.cold,
                    };
                });
            } catch (err) {
                alert(
                    err instanceof Error ? err.message : "Failed to delete lead."
                );
            }
        },
        [leads]
    );

    const handleExport = useCallback(() => {
        if (!leads.length) {
            alert("No leads to export yet.");
            return;
        }
        exportLeadsCSV(leads);
    }, [leads]);

    return { leads, stats, loading, error, refresh, handleDelete, handleExport };
}