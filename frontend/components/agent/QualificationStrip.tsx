"use client";
import type { QualificationData } from "@/lib/types";
import { ConversationStageBadge } from "@/components/ui/Badge";

export function QualificationStrip({ data }: { data: QualificationData | null }) {
    const val = (v: string | boolean | undefined) => {
        if (!v || v === "unknown") return null;
        if (typeof v === "boolean") return v ? "Yes" : "No";
        return v;
    };

    const fields = [
        { label: "Intent", value: val(data?.intent) },
        { label: "Budget", value: val(data?.budget) },
        { label: "Timeline", value: val(data?.timeline) },
    ];

    return (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {fields.map((f) => (
                    <div key={f.label}>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{f.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: f.value ? "var(--text-primary)" : "var(--text-muted)", fontStyle: f.value ? "normal" : "italic" }}>{f.value ?? "—"}</p>
                    </div>
                ))}
                <div>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Stage</p>
                    {data?.conversation_stage && <ConversationStageBadge stage={data.conversation_stage} />}
                    {!data && <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>—</p>}
                </div>
            </div>
        </div>
    );
}