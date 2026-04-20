"use client";

import { useLeads } from "@/hooks/useLeads";
import { LeadScoreBadge } from "@/components/ui/Badge";
import type { Lead, LeadScore } from "@/lib/types";

export default function DashboardPage() {
    const { leads, stats, loading, error, refresh, handleDelete, handleExport } =
        useLeads();

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

            {/* ── Header ─────────────────────────────────────────────── */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 28,
                }}
            >
                <div>
                    <h1
                        style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 32,
                            fontWeight: 800,
                            letterSpacing: "-0.03em",
                            margin: 0,
                        }}
                    >
                        <span className="gradient-text">Lead</span>{" "}
                        <span style={{ color: "var(--text-primary)" }}>Dashboard</span>
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                        All captured leads · auto-refreshes every 30s
                    </p>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={handleExport}
                        style={{
                            padding: "7px 16px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--surface)",
                            color: "var(--text-muted)",
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: "var(--font-body)",
                        }}
                    >
                        ↓ Export CSV
                    </button>
                    <button
                        onClick={refresh}
                        style={{
                            padding: "7px 16px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--surface)",
                            color: "var(--text-muted)",
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: "var(--font-body)",
                        }}
                    >
                        ⟳ Refresh
                    </button>
                </div>
            </div>

            {/* ── Error banner ───────────────────────────────────────── */}
            {error && (
                <div
                    style={{
                        background: "rgba(255,77,109,0.08)",
                        border: "1px solid rgba(255,77,109,0.25)",
                        borderRadius: 12,
                        padding: "12px 16px",
                        marginBottom: 20,
                        fontSize: 13,
                        color: "var(--hot)",
                    }}
                >
                    ❌ {error}
                </div>
            )}

            {/* ── Stat cards ─────────────────────────────────────────── */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                <StatCard label="Total Leads" value={stats.total} color="var(--brand-light)" />
                <StatCard label="🔥 Hot" value={stats.hot} color="var(--hot)" />
                <StatCard label="🌤️ Warm" value={stats.warm} color="var(--warm)" />
                <StatCard label="❄️ Cold" value={stats.cold} color="var(--cold)" />
            </div>

            {/* ── Leads table ────────────────────────────────────────── */}
            <div
                style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    overflow: "hidden",
                }}
            >
                {/* Table header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 20px",
                        borderBottom: "1px solid var(--border)",
                    }}
                >
                    <span
                        style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                        }}
                    >
                        All Leads
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {stats.total} total
                    </span>
                </div>

                {/* Loading state */}
                {loading && (
                    <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                        Loading leads...
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && leads.length === 0 && (
                    <div style={{ padding: 64, textAlign: "center" }}>
                        <p style={{ fontSize: 28, marginBottom: 8 }}>🎙️</p>
                        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                            No leads yet
                        </p>
                        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                            Start a voice conversation on the Agent page to capture your first lead.
                        </p>
                    </div>
                )}

                {/* Table */}
                {!loading && leads.length > 0 && (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    {["Score", "First Message", "Intent", "Budget", "Timeline", "Date", ""].map(
                                        (col) => (
                                            <th
                                                key={col}
                                                style={{
                                                    padding: "9px 20px",
                                                    textAlign: "left",
                                                    fontSize: 11,
                                                    color: "var(--text-muted)",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.06em",
                                                    borderBottom: "1px solid var(--border)",
                                                    fontWeight: 500,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {col}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <LeadRow
                                        key={lead.session_id}
                                        lead={lead}
                                        onDelete={() => handleDelete(lead.session_id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── StatCard ────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div
            style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 20,
            }}
        >
            <p
                style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    margin: "0 0 8px 0",
                    fontFamily: "var(--font-body)",
                }}
            >
                {label}
            </p>
            <p
                style={{
                    fontSize: 36,
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    color,
                    margin: 0,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                }}
            >
                {value}
            </p>
        </div>
    );
}

// ── LeadRow ─────────────────────────────────────────────────────

function LeadRow({
    lead,
    onDelete,
}: {
    lead: Lead;
    onDelete: () => void;
}) {
    // qualification_data can be a string (JSON) or already-parsed object
    const qd =
        typeof lead.qualification_data === "string"
            ? (() => {
                try { return JSON.parse(lead.qualification_data); }
                catch { return {}; }
            })()
            : lead.qualification_data ?? {};

    const intent = qd?.intent && qd.intent !== "unknown" ? qd.intent : "—";
    const budget = qd?.budget && qd.budget !== "unknown" ? qd.budget : "—";
    const timeline = qd?.timeline && qd.timeline !== "unknown" ? qd.timeline : "—";

    // Format date: "2024-01-15T10:30:00" → "Jan 15, 2024"
    const date = lead.created_at
        ? new Date(lead.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : "—";

    // Truncate long first messages
    const firstMsg =
        lead.first_message?.length > 50
            ? lead.first_message.slice(0, 50) + "..."
            : lead.first_message ?? "—";

    const TD = ({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) => (
        <td
            style={{
                padding: "12px 20px",
                fontSize: 13,
                color: muted ? "var(--text-muted)" : "var(--text-primary)",
                borderBottom: "1px solid rgba(31,31,46,0.6)",
                whiteSpace: "nowrap",
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
            }}
        >
            {children}
        </td>
    );

    return (
        <tr
            style={{ transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
            <TD>
                <LeadScoreBadge
                    score={lead.lead_score as LeadScore}
                    pulse={lead.lead_score === "HOT"}
                />
            </TD>
            <TD muted>{firstMsg}</TD>
            <TD muted>{intent}</TD>
            <TD muted>{budget}</TD>
            <TD muted>{timeline}</TD>
            <TD muted>{date}</TD>
            <td
                style={{
                    padding: "12px 20px",
                    borderBottom: "1px solid rgba(31,31,46,0.6)",
                }}
            >
                <button
                    onClick={onDelete}
                    title="Delete lead"
                    style={{
                        background: "transparent",
                        border: "1px solid rgba(255,77,109,0.2)",
                        borderRadius: 6,
                        color: "rgba(255,77,109,0.6)",
                        fontSize: 12,
                        padding: "3px 10px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,77,109,0.1)";
                        (e.currentTarget as HTMLElement).style.color = "var(--hot)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,77,109,0.6)";
                    }}
                >
                    Delete
                </button>
            </td>
        </tr>
    );
}