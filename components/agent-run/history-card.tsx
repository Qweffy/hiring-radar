import Link from "next/link";
import  { type CSSProperties } from "react";

import { StatusBadge, type StatusValue } from "@/components/ui/status-badge";


/**
 * Card 3 of the status panel — the run history list. Each row is a status
 * badge, a mono summary line, and a relative timestamp; clicking opens that
 * run. The summary line is precomputed server-side so this stays presentational.
 */
export interface HistoryRow {
  runId: number;
  badge: StatusValue;
  summary: string;
  when: string;
}

export interface HistoryCardProps {
  rows: HistoryRow[];
}

const cardStyle: CSSProperties = {
  padding: 18,
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
};

export function HistoryCard({ rows }: HistoryCardProps) {
  return (
    <div style={cardStyle}>
      <span
        style={{
          font: "var(--label-mono)",
          letterSpacing: "var(--label-tracking)",
          textTransform: "uppercase",
          color: "var(--text-low)",
        }}
      >
        Run history
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 10 }}>
        {rows.length === 0 ? (
          <span
            style={{
              font: "var(--mono-sm)",
              color: "var(--text-low-content)",
              padding: "9px 8px",
            }}
          >
            No earlier runs.
          </span>
        ) : (
          rows.map((row) => (
            <Link
              key={row.runId}
              href={`/agent/${row.runId}`}
              className="hr-history-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 8px",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
              }}
            >
              <StatusBadge status={row.badge} />
              <span style={{ flex: 1, font: "var(--mono-sm)", color: "var(--text-mid)" }}>
                {row.summary}
              </span>
              <span style={{ font: "var(--mono-sm)", color: "var(--text-low)" }}>{row.when}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
