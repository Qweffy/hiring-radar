"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { runAgentScan } from "@/app/(app)/agent/actions";
import { AgentRunKeyframes } from "@/components/agent-run/agent-run-keyframes";
import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";

/**
 * The "agent is idle" empty state (Agent Run.dc.html state 09). When a profile
 * exists, the primary action starts a first scan and routes to its live trace;
 * when none exists, it points the user to complete their profile first (the
 * scan can't run without one). A start failure surfaces inline rather than
 * silently no-op'ing.
 */
export interface AgentEmptyProps {
  hasProfile: boolean;
}

export function AgentEmpty({ hasProfile }: AgentEmptyProps) {
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
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{ padding: 32, fontFamily: "var(--font-ui)" }}
    >
      <AgentRunKeyframes />
      <span
        style={{
          font: "var(--label-mono)",
          letterSpacing: "var(--label-tracking)",
          textTransform: "uppercase",
          color: "var(--text-low)",
          marginBottom: 14,
        }}
      >
        The agent is idle
      </span>
      <HRIllustration name="agent-orb-idle" size={100} />
      <h3
        style={{
          margin: "14px 0 6px",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 18,
          color: "var(--text-hi)",
        }}
      >
        No scans yet
      </h3>
      <p
        style={{
          margin: "0 0 18px",
          maxWidth: 320,
          font: "var(--text-sm)",
          color: "var(--text-mid)",
        }}
      >
        Complete your profile, then run a first scan to get matched picks.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        {hasProfile ? (
          <Button variant="primary" iconLeft="bot" onClick={onRun} loading={pending}>
            Run first scan
          </Button>
        ) : (
          <Button
            variant="ghost"
            iconRight="arrow-right"
            onClick={() => router.push("/profile")}
          >
            Complete your profile first
          </Button>
        )}
      </div>
      {error && (
        <p style={{ marginTop: 14, font: "var(--mono-sm)", color: "var(--red)" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
