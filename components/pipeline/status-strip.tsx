import  { type CSSProperties } from "react";

import  { type PipelineHealth, type PipelineSummary } from "@/lib/queries/pipeline";


const HEALTH_COLOR: Record<PipelineHealth, string> = {
  healthy: "var(--phosphor)",
  degraded: "var(--red)",
  syncing: "var(--amber)",
  idle: "var(--text-low-content)",
};

const HEALTH_LABEL: Record<PipelineHealth, [string, string]> = {
  healthy: ["System", "healthy"],
  degraded: ["System", "degraded"],
  syncing: ["System", "syncing"],
  idle: ["System", "idle"],
};

const labelRow: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

const valueRow: CSSProperties = {
  font: "var(--mono-sm)",
  color: "var(--text-mid)",
};

function Divider() {
  return (
    <span
      aria-hidden="true"
      style={{ width: 1, height: 34, background: "var(--divider)", flexShrink: 0 }}
    />
  );
}

interface SegmentProps {
  label: string;
  children: React.ReactNode;
}

function Segment({ label, children }: SegmentProps) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: 4, padding: "0 26px", flexShrink: 0 }}
    >
      <span style={labelRow}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

/** Full-width status strip: system health + last/next sweep + index + model. */
export function StatusStrip({ summary }: { summary: PipelineSummary }) {
  const color = HEALTH_COLOR[summary.health];
  const [line1, line2] = HEALTH_LABEL[summary.health];
  const modelShort = summary.embedModel.split("/").pop() ?? summary.embedModel;

  return (
    <div
      className="flex items-center"
      style={{
        gap: 0,
        padding: "16px 20px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Segment A — system health */}
      <div
        className="flex items-center"
        style={{ gap: 11, paddingRight: 26, flexShrink: 0 }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 10px ${color}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            font: "600 11px/1.3 var(--font-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color,
          }}
        >
          {line1}
          <br />
          {line2}
        </span>
      </div>

      <Divider />
      <Segment label="Last sweep">
        {summary.lastSweepTime === null ? (
          <span style={{ ...valueRow, color: "var(--text-low-content)" }}>—</span>
        ) : (
          <span style={{ font: "var(--mono-sm)", color: "var(--text-hi)" }}>
            {summary.lastSweepTime}{" "}
            <span
              style={{ color: summary.lastSweepOk ? "var(--phosphor)" : "var(--red)" }}
            >
              {summary.lastSweepOk ? "✓" : "✗"}
            </span>
          </span>
        )}
      </Segment>

      <Divider />
      <Segment label="Next">
        <span style={valueRow}>{summary.nextSweep}</span>
      </Segment>

      <Divider />
      <Segment label="Index">
        <span style={valueRow}>
          {summary.indexVectors.toLocaleString("en-US")} vectors
        </span>
      </Segment>

      <Divider />
      <Segment label="Embed model">
        <span style={valueRow}>
          {modelShort} · {summary.embedDims}d
        </span>
      </Segment>
    </div>
  );
}
