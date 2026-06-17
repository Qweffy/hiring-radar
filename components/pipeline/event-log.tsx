"use client";

import { useState } from "react";
import  { type CSSProperties } from "react";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface LogLine {
  id: string;
  ts: string;
  level: LogLevel;
  msg: string;
}

type LogFilter = "all" | "info" | "warn" | "error";

const LOG_TABS: LogFilter[] = ["all", "info", "warn", "error"];

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: "var(--cyan)",
  WARN: "var(--amber)",
  ERROR: "var(--red)",
};

const headerLabel: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

/** Full-width event log: mono lines with a level filter. */
export function EventLog({ lines }: { lines: LogLine[] }) {
  const [filter, setFilter] = useState<LogFilter>("all");

  const visible = lines.filter(
    (line) => filter === "all" || line.level.toLowerCase() === filter,
  );

  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}
    >
      <style href="hr-event-log" precedence="medium">
        {`.hr-log-line:hover{background:color-mix(in srgb, var(--text-mid) 3%, transparent)}`}
      </style>

      <div
        className="flex items-center"
        style={{ gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--divider)" }}
      >
        <span style={headerLabel}>Event log</span>
        <span className="flex-1" />
        <div className="flex items-center" style={{ gap: 6 }}>
          {LOG_TABS.map((tab) => {
            const active = tab === filter;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                aria-pressed={active}
                className="cursor-pointer"
                style={{
                  height: 26,
                  padding: "0 10px",
                  borderRadius: "var(--radius-sm)",
                  font: "600 10px/1 var(--font-mono)",
                  letterSpacing: "0.08em",
                  background: active ? "var(--phosphor-12)" : "transparent",
                  color: active ? "var(--phosphor)" : "var(--text-low)",
                  border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
                }}
              >
                {tab.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "6px 0" }}>
        {visible.length === 0 ? (
          <div
            style={{
              padding: "20px 18px",
              font: "var(--mono-sm)",
              color: "var(--text-low-content)",
            }}
          >
            No {filter === "all" ? "" : `${filter} `}events.
          </div>
        ) : (
          visible.map((line) => (
            <div
              key={line.id}
              className="hr-log-line flex items-center"
              style={{ gap: 14, padding: "7px 18px" }}
            >
              <span
                style={{
                  font: "var(--mono-sm)",
                  color: "var(--text-low)",
                  whiteSpace: "nowrap",
                }}
              >
                {line.ts}
              </span>
              <span
                style={{
                  width: 46,
                  flexShrink: 0,
                  font: "600 10px/1 var(--font-mono)",
                  letterSpacing: "0.06em",
                  color: LEVEL_COLOR[line.level],
                }}
              >
                {line.level}
              </span>
              <span
                className="flex-1"
                style={{
                  font: "var(--mono-sm)",
                  color: line.level === "ERROR" ? "var(--text-hi)" : "var(--text-mid)",
                }}
              >
                {line.msg}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
