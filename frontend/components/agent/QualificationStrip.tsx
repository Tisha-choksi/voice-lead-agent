// FILE PATH: voice-lead-agent/frontend/components/agent/QualificationStrip.tsx
//
// WHY THIS FILE EXISTS:
//   Shows the 4 key lead qualification fields in real time:
//   [ Intent ] [ Budget ] [ Timeline ] [ Stage ]
//   Updated after every Aria response as the LLM extracts more data.

"use client";

import type { QualificationData } from "@/lib/types";
import { ConversationStageBadge } from "@/components/ui/Badge";

interface QualificationStripProps {
  data: QualificationData | null;
}

export function QualificationStrip({ data }: QualificationStripProps) {
  // Helper — shows "—" for unknown/empty values
  const val = (v: string | boolean | undefined) => {
    if (!v || v === "unknown" || v === "") return null;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return v;
  };

  const fields = [
    { label: "Intent",    value: val(data?.intent) },
    { label: "Budget",    value: val(data?.budget) },
    { label: "Timeline",  value: val(data?.timeline) },
    {
      label: "Stage",
      value: null, // Rendered separately as a badge
      stage: data?.conversation_stage,
    },
  ];

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
      aria-label="Lead qualification data"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {fields.map((field) => (
          <div key={field.label}>
            <p
              className="text-xs uppercase tracking-widest mb-1"
              style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}
            >
              {field.label}
            </p>

            {/* Stage field renders as a badge */}
            {field.label === "Stage" && field.stage ? (
              <ConversationStageBadge stage={field.stage} />
            ) : (
              <p
                className="text-sm font-medium truncate"
                style={{
                  color: field.value ? "var(--text-primary)" : "var(--text-muted)",
                  fontStyle: field.value ? "normal" : "italic",
                }}
                title={field.value ?? "Not yet collected"}
              >
                {field.value ?? "—"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}