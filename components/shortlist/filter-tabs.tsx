"use client";

import  { type CSSProperties } from "react";

import  { type TabDef, type TabId } from "@/components/shortlist/view-model";


export interface FilterTabsProps {
  tabs: TabDef[];
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
}

/**
 * Pipeline-stage filter tabs (All · New · Applied · Interviewing · Offer ·
 * Archived). The active tab gets a phosphor underline + filled count chip;
 * selecting a tab also closes any open kebab (handled by the parent).
 */
export function FilterTabs({ tabs, activeTab, onSelect }: FilterTabsProps) {
  return (
    <div
      className="hr-xscroll"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 18,
        borderBottom: "1px solid var(--divider)",
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        const tabStyle: CSSProperties = {
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          flexShrink: 0,
          padding: "0 14px",
          height: 38,
          background: "transparent",
          border: "none",
          whiteSpace: "nowrap",
          borderBottom: active
            ? "2px solid var(--phosphor)"
            : "2px solid transparent",
          color: active ? "var(--text-hi)" : "var(--text-mid)",
          font: "500 13px/1 var(--font-ui)",
          cursor: "pointer",
          marginBottom: -1,
        };
        const chipStyle: CSSProperties = {
          font: "600 11px/1 var(--font-mono)",
          padding: "2px 6px",
          borderRadius: "var(--radius-sm)",
          color: active ? "var(--phosphor)" : "var(--text-low)",
          background: active ? "var(--phosphor-12)" : "var(--bg-raised)",
        };
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-pressed={active}
            style={tabStyle}
          >
            {tab.label}
            <span style={chipStyle}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}
