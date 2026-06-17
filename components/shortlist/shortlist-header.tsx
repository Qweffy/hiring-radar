"use client";

import { Bot, ChevronDown } from "lucide-react";

import { Menu } from "@/components/ui/menu";

export type ShortlistSort = "match" | "added";

const SORT_LABEL: Record<ShortlistSort, string> = {
  match: "Match",
  added: "Recent",
};

export interface ShortlistHeaderProps {
  trackedCount: number;
  scanning: boolean;
  onRunScan: () => void;
  sort: ShortlistSort;
  onSortChange: (sort: ShortlistSort) => void;
}

/**
 * In-shell production header: title, "{N} TRACKED" mono count, a Sort menu
 * (Match descending / Recently added), and the violet "Run agent scan" CTA.
 * The CTA is disabled while a run is live.
 */
export function ShortlistHeader({
  trackedCount,
  scanning,
  onRunScan,
  sort,
  onSortChange,
}: ShortlistHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 14,
        rowGap: 12,
        marginBottom: 18,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: "var(--text-hi)",
        }}
      >
        Shortlist
      </h2>
      <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
        {trackedCount} TRACKED
      </span>

      <span style={{ flex: 1 }} />

      <Menu
        align="right"
        items={[
          {
            label: "Match (high → low)",
            onSelect: () => onSortChange("match"),
          },
          {
            label: "Recently added",
            onSelect: () => onSortChange("added"),
          },
        ]}
        trigger={
          <button
            type="button"
            className="hr-sort-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 30,
              padding: "0 11px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-control)",
              color: "var(--text-mid)",
              font: "var(--mono-sm)",
              cursor: "pointer",
            }}
          >
            Sort: {SORT_LABEL[sort]}
            <ChevronDown
              size={13}
              strokeWidth={1.5}
              aria-hidden
              style={{ opacity: 0.6 }}
            />
          </button>
        }
      />

      <button
        type="button"
        onClick={onRunScan}
        disabled={scanning}
        className="hr-scan-cta"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 36,
          padding: "0 16px",
          background: "var(--violet)",
          border: "1px solid transparent",
          borderRadius: "var(--radius-control)",
          color: "#160A2E",
          font: "600 13px/1 var(--font-ui)",
          cursor: scanning ? "not-allowed" : "pointer",
          opacity: scanning ? 0.6 : 1,
          boxShadow: "var(--glow-violet)",
        }}
      >
        <Bot size={16} strokeWidth={1.5} aria-hidden />
        {scanning ? "Scanning…" : "Run agent scan"}
      </button>

      <style href="hr-shortlist-header" precedence="medium">
        {`.hr-sort-btn:hover { border-color: var(--border-strong); }
.hr-scan-cta:enabled:hover { background: #b9a2ff; }`}
      </style>
    </div>
  );
}
