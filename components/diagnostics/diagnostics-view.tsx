"use client";

import { useState, type CSSProperties } from "react";

import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";
import { relativeTime } from "@/lib/format";
import {
  type ErrorEventRow,
  type ErrorSummary,
} from "@/lib/queries/errors";

const LEVEL_TONE: Record<ErrorEventRow["level"], string> = {
  warn: "var(--amber)",
  error: "var(--red)",
  fatal: "var(--red)",
};

const LEVEL_TINT: Record<ErrorEventRow["level"], string> = {
  warn: "var(--amber-14)",
  error: "var(--red-14)",
  fatal: "var(--red-14)",
};

export interface DiagnosticsViewProps {
  events: ErrorEventRow[];
  summary: ErrorSummary;
  /** Server timestamp (epoch ms) — keeps relative times hydration-stable. */
  now: number;
}

const LABEL: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

function LevelBadge({ level }: { level: ErrorEventRow["level"] }) {
  return (
    <span
      className="uppercase"
      style={{
        flexShrink: 0,
        padding: "1px 7px",
        font: "600 10px/1.6 var(--font-mono)",
        letterSpacing: "0.08em",
        color: LEVEL_TONE[level],
        background: LEVEL_TINT[level],
        border: `1px solid ${LEVEL_TONE[level]}`,
        borderRadius: "var(--radius-sm)",
      }}
    >
      {level}
    </span>
  );
}

function SourceChip({ source }: { source: string }) {
  return (
    <span
      style={{
        flexShrink: 0,
        padding: "1px 7px",
        font: "var(--mono-sm)",
        color: "var(--text-mid)",
        background: "var(--bg-void)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {source}
    </span>
  );
}

function EventRow({ event, now }: { event: ErrorEventRow; now: Date }) {
  const [open, setOpen] = useState(false);
  const hasDetail = event.stack !== null || event.context !== null;

  return (
    <div style={{ borderBottom: "1px solid var(--divider)" }}>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className="flex w-full items-start text-left"
        style={{
          gap: 12,
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: hasDetail ? "pointer" : "default",
        }}
      >
        <span
          className="whitespace-nowrap"
          style={{ flexShrink: 0, width: 64, font: "var(--mono-sm)", color: "var(--text-low-content)" }}
        >
          {relativeTime(event.createdAt, now)}
        </span>
        <LevelBadge level={event.level} />
        <SourceChip source={event.source} />
        <span
          className="min-w-0 flex-1 truncate"
          style={{ font: "var(--text-sm)", color: "var(--text-mid)" }}
        >
          {event.message}
        </span>
        {hasDetail ? (
          <Icon
            name={open ? "chevron-down" : "chevron-right"}
            size={15}
            style={{ flexShrink: 0, color: "var(--text-low)" }}
          />
        ) : null}
      </button>

      {open ? (
        <div style={{ padding: "0 16px 14px 76px", display: "flex", flexDirection: "column", gap: 10 }}>
          {event.path !== null ? (
            <div style={{ font: "var(--mono-sm)", color: "var(--cyan)" }}>{event.path}</div>
          ) : null}
          {event.context !== null ? (
            <pre style={preStyle}>{JSON.stringify(event.context, null, 2)}</pre>
          ) : null}
          {event.stack !== null ? <pre style={preStyle}>{event.stack}</pre> : null}
        </div>
      ) : null}
    </div>
  );
}

const preStyle: CSSProperties = {
  margin: 0,
  padding: 12,
  maxHeight: 280,
  overflow: "auto",
  font: "var(--mono-sm)",
  color: "var(--text-low-content)",
  background: "var(--bg-void)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const PANEL: CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
};

export function DiagnosticsView({ events, summary, now }: DiagnosticsViewProps) {
  const nowDate = new Date(now);
  const degradations = summary.bySource.filter((s) =>
    s.source === "search" || s.source === "memory" || s.source === "parse",
  );

  return (
    <div className="absolute inset-0 overflow-auto" style={{ padding: "clamp(16px, 4vw, 28px)" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div className="flex items-center" style={{ gap: 14, marginBottom: 18 }}>
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
            Diagnostics
          </h2>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            {summary.total24h} EVENTS · 24H
          </span>
        </div>

        {/* Summary strip */}
        <div
          className="flex flex-wrap items-center"
          style={{ ...PANEL, gap: 18, padding: "14px 18px", marginBottom: 16 }}
        >
          <span style={LABEL}>Last 24h</span>
          {summary.byLevel.length === 0 ? (
            <span style={{ font: "var(--mono-sm)", color: "var(--phosphor)" }}>
              all clear
            </span>
          ) : (
            summary.byLevel.map((l) => (
              <span key={l.level} className="flex items-center" style={{ gap: 7 }}>
                <LevelBadge level={l.level} />
                <span style={{ font: "var(--mono-base)", color: "var(--text-hi)" }}>
                  {l.count}
                </span>
              </span>
            ))
          )}
          {degradations.length > 0 ? (
            <>
              <span style={{ flex: 1 }} />
              <span style={LABEL}>Degraded</span>
              {degradations.map((d) => (
                <span key={d.source} className="flex items-center" style={{ gap: 6 }}>
                  <SourceChip source={d.source} />
                  <span style={{ font: "var(--mono-sm)", color: "var(--amber)" }}>
                    {d.count}
                  </span>
                </span>
              ))}
            </>
          ) : null}
        </div>

        {/* Event log */}
        <div style={PANEL}>
          {events.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{ padding: 48, gap: 12 }}
            >
              <HRIllustration name="empty-radar" size={88} />
              <span style={{ font: "var(--text-base)", color: "var(--text-mid)" }}>
                No errors logged — clean signal.
              </span>
            </div>
          ) : (
            events.map((event) => (
              <EventRow key={event.id} event={event} now={nowDate} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
