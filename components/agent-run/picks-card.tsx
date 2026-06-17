import Link from "next/link";
import  { type CSSProperties } from "react";

import { Radial } from "@/components/agent-run/radial";
import { Button } from "@/components/ui/button";
import  { type RunPick } from "@/lib/queries/agent-runs";


/**
 * Card 2 of the status panel — the picks the run has shortlisted so far (each a
 * row with a violet mini score radial, linking to the posting), plus the
 * Pause / Cancel controls. The control affordance varies by run state, so the
 * parent supplies a `controls` slot rather than this card deciding.
 */
export interface PicksCardProps {
  picks: RunPick[];
  controls: React.ReactNode;
}

const cardStyle: CSSProperties = {
  padding: 18,
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
};

const labelStyle: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

export function PicksCard({ picks, controls }: PicksCardProps) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={labelStyle}>Picks so far</span>
        <span style={{ font: "var(--mono-sm)", color: "var(--phosphor)" }}>{picks.length}</span>
      </div>

      {picks.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {picks.map((pick) => (
            <Link
              key={pick.hnId}
              href={`/browse?selected=${pick.hnId}`}
              className="hr-pick-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 12px",
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-control)",
                textDecoration: "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    font: "600 13px/1.3 var(--font-ui)",
                    color: "var(--text-hi)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pick.company ?? "Unknown company"}
                </div>
                <div
                  style={{
                    font: "var(--text-xs)",
                    color: "var(--text-mid)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pick.role ?? "—"}
                </div>
              </div>
              <Radial
                size={38}
                radius={16}
                strokeWidth={4}
                value={(pick.score ?? 0) / 100}
                trackColor="rgba(167,139,250,0.16)"
                progressColor="var(--violet)"
              >
                <span style={{ font: "600 12px/1 var(--font-mono)", color: "var(--text-hi)" }}>
                  {pick.score ?? "—"}
                </span>
              </Radial>
            </Link>
          ))}
        </div>
      ) : (
        <div
          style={{
            font: "var(--mono-sm)",
            color: "var(--text-low-content)",
            padding: "8px 0",
          }}
        >
          No picks yet — the agent is still scanning.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>{controls}</div>
    </div>
  );
}

/** Pause + Cancel controls for a running run. */
export function RunningControls({
  onPause,
  onCancel,
  pending,
}: {
  onPause: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <>
      <Button
        variant="ghost"
        iconLeft="pause"
        style={{ flex: 1 }}
        onClick={onPause}
        disabled={pending}
      >
        Pause
      </Button>
      <Button variant="destructive" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
    </>
  );
}

/** Resume + Cancel controls for a paused run. */
export function PausedControls({
  onResume,
  onCancel,
  pending,
}: {
  onResume: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <>
      <Button
        variant="primary"
        iconLeft="play"
        style={{ flex: 1 }}
        onClick={onResume}
        disabled={pending}
      >
        Resume
      </Button>
      <Button variant="destructive" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
    </>
  );
}
