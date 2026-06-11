"use client";

import * as React from "react";

export interface TabItem {
  value: string;
  label: string;
  /** Optional mono count badge. */
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/**
 * Tabs — filter tabs with mono counts. Underline indicator in phosphor.
 */
export function Tabs({ tabs, value, onChange, style }: TabsProps) {
  return (
    <div
      role="tablist"
      className="flex"
      style={{ gap: 4, borderBottom: "1px solid var(--divider)", ...style }}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(tab.value)}
            className="inline-flex cursor-pointer items-center"
            style={{
              gap: 8,
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              color: selected ? "var(--text-heading)" : "var(--text-body)",
              font: "500 13px/1 var(--font-ui)",
              borderBottom: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
              transition: "color var(--dur-fast)",
            }}
          >
            {tab.label}
            {tab.count != null && (
              <span
                style={{
                  font: "600 11px/1 var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  color: selected ? "var(--accent)" : "var(--text-muted)",
                  background: selected ? "var(--phosphor-12)" : "var(--divider)",
                  borderRadius: "var(--radius-sm)",
                  padding: "3px 6px",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
