"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";
import { reportClientError } from "@/lib/report-client-error";

interface AgentErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

/** Route error boundary for the Agent Run segment — the run failed to load. */
export default function AgentError({ error, unstable_retry }: AgentErrorProps) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{ padding: 40, fontFamily: "var(--font-ui)" }}
    >
      <div style={{ marginBottom: 18 }}>
        <HRIllustration name="static-interference" size={120} />
      </div>
      <h2
        style={{
          margin: "0 0 8px",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: "-0.02em",
          color: "var(--text-hi)",
        }}
      >
        Couldn&apos;t load this run
      </h2>
      <p
        className="m-0"
        style={{
          font: "var(--text-base)",
          color: "var(--text-mid)",
          maxWidth: 420,
          marginBottom: 16,
        }}
      >
        The agent run view crashed — the rest of the radar is fine.
      </p>
      <div
        className="flex items-center"
        style={{
          gap: 9,
          padding: "10px 14px",
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-control)",
          marginBottom: 22,
        }}
      >
        <Icon name="alert-triangle" size={16} style={{ color: "var(--amber)" }} />
        <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
          The run snapshot or its trace failed to load.
        </span>
        {error.digest ? (
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low)" }}>
            id {error.digest.slice(0, 8)}
          </span>
        ) : null}
      </div>
      <Button variant="primary" iconLeft="retry" onClick={() => unstable_retry()}>
        Retry
      </Button>
    </div>
  );
}
