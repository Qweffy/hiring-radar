"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { runAgentScan } from "@/app/(app)/agent/actions";
import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { relativeTime } from "@/lib/format";
import  { type AgentDigestData } from "@/lib/queries/dashboard";

export interface AgentDigestProps {
  /** Latest run digest, or null when the agent has never run. */
  digest: AgentDigestData | null;
  /** Server timestamp (epoch ms) — keeps relative times hydration-stable. */
  now: number;
}

const PANEL_STYLE = {
  padding: 18,
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
} as const;

const STATUS_TONE: Record<AgentDigestData["status"], string> = {
  running: "var(--phosphor)",
  completed: "var(--phosphor)",
  paused: "var(--amber)",
  failed: "var(--red)",
  cancelled: "var(--text-low)",
};

function DigestHeader() {
  return (
    <div className="flex items-center" style={{ gap: 10, marginBottom: 18 }}>
      <HRIllustration name="agent-orb-idle" size={34} />
      <span
        className="uppercase"
        style={{
          font: "var(--label-mono)",
          letterSpacing: "var(--label-tracking)",
          color: "var(--violet)",
        }}
      >
        Agent digest
      </span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 4 }}>
      <span className="hr-label">{label}</span>
      <span style={{ font: "var(--mono-base)", color: tone ?? "var(--text-hi)" }}>
        {value}
      </span>
    </div>
  );
}

function costLabel(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

/** Populated digest: last-run summary + the run's strongest pick. */
function DigestSummary({ digest, now }: { digest: AgentDigestData; now: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isLive = digest.status === "running" || digest.status === "paused";

  const onRun = (): void => {
    setError(null);
    startTransition(async () => {
      const result = await runAgentScan();
      if (result.ok) {
        router.push(`/agent/${result.data.runId}`);
      } else {
        setError(result.error);
      }
    });
  };

  const finishedAt = digest.finishedAt ?? digest.startedAt;

  return (
    <div className="flex flex-1 flex-col" style={PANEL_STYLE}>
      <DigestHeader />

      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <span style={{ font: "var(--mono-base)", color: "var(--text-hi)" }}>
          Run #{digest.runId}
        </span>
        <span
          className="uppercase"
          style={{
            font: "600 10px/1 var(--font-mono)",
            letterSpacing: "0.1em",
            color: STATUS_TONE[digest.status],
          }}
        >
          {digest.status}
        </span>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 16 }}
      >
        <Stat label="Picks" value={String(digest.picksCount)} tone="var(--violet)" />
        <Stat label="Steps" value={`${digest.stepsUsed} / ${digest.stepBudget}`} />
        <Stat label="Cost" value={costLabel(digest.costUsd)} />
        <Stat label={isLive ? "Started" : "Finished"} value={relativeTime(finishedAt, new Date(now))} />
      </div>

      {/* Top match */}
      {digest.topMatch !== null ? (
        <button
          type="button"
          onClick={() => router.push(`/browse?selected=${digest.topMatch?.hnId}`)}
          className="flex w-full cursor-pointer items-center text-left hover:[border-color:color-mix(in_srgb,var(--violet)_50%,transparent)]"
          style={{
            gap: 14,
            padding: 14,
            marginBottom: 16,
            background: "var(--violet-12)",
            border: "1px solid color-mix(in srgb, var(--violet) 28%, transparent)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <ScoreGauge score={digest.topMatch.score} size={52} />
          <span className="flex min-w-0 flex-1 flex-col" style={{ gap: 3 }}>
            <span className="hr-label" style={{ color: "var(--violet)" }}>
              Top match
            </span>
            <span
              className="truncate"
              style={{ font: "600 14px/1.3 var(--font-ui)", color: "var(--text-hi)" }}
            >
              {digest.topMatch.company}
            </span>
            <span
              className="truncate"
              style={{ font: "var(--text-sm)", color: "var(--text-mid)" }}
            >
              {digest.topMatch.role}
            </span>
          </span>
          <Icon name="chevron-right" size={16} style={{ color: "var(--violet)" }} />
        </button>
      ) : null}

      <div className="mt-auto flex items-center" style={{ gap: 10 }}>
        <Button
          variant="ghost"
          iconRight="arrow-right"
          onClick={() => router.push(`/agent/${digest.runId}`)}
        >
          Open run
        </Button>
        <Button
          variant="primary"
          iconLeft="bot"
          onClick={onRun}
          loading={pending}
          disabled={isLive}
          title={isLive ? "A run is already in progress" : undefined}
        >
          Run again
        </Button>
      </div>
      {error ? (
        <p style={{ marginTop: 12, font: "var(--mono-sm)", color: "var(--red)" }} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Empty state — the agent has never run. */
function DigestEmpty() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onRun = (): void => {
    setError(null);
    startTransition(async () => {
      const result = await runAgentScan();
      if (result.ok) {
        router.push(`/agent/${result.data.runId}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col" style={PANEL_STYLE}>
      <DigestHeader />
      <div
        className="flex flex-1 flex-col items-center justify-center text-center"
        style={{ gap: 8 }}
      >
        <HRIllustration name="agent-orb-idle" size={86} />
        <h3 style={{ font: "600 17px/1.25 var(--font-display)", color: "var(--text-hi)" }}>
          The agent hasn&apos;t scanned for you yet
        </h3>
        <p
          className="m-0"
          style={{ font: "var(--text-sm)", color: "var(--text-mid)", maxWidth: 320 }}
        >
          Set up your profile, then run a first scan to get a shortlist.
        </p>
        <div className="flex items-center" style={{ gap: 10, marginTop: 4 }}>
          <Button
            variant="ghost"
            iconRight="arrow-right"
            onClick={() => router.push("/profile")}
          >
            Set up profile
          </Button>
          <Button variant="primary" iconLeft="bot" onClick={onRun} loading={pending}>
            Run first scan
          </Button>
        </div>
        {error ? (
          <p style={{ marginTop: 10, font: "var(--mono-sm)", color: "var(--red)" }} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Agent Digest card. Shows the latest run's summary (picks, steps, cost, time)
 * and its top match when the agent has run; otherwise the "hasn't scanned yet"
 * empty state. Both variants can start a fresh scan and route to its trace.
 */
export function AgentDigest({ digest, now }: AgentDigestProps) {
  if (digest === null) return <DigestEmpty />;
  return <DigestSummary digest={digest} now={now} />;
}
