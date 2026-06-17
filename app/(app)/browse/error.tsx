"use client";

import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";

interface BrowseErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

/** LOST SIGNAL — route error boundary for the browse segment. */
export default function BrowseError({ error, unstable_retry }: BrowseErrorProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{ padding: 40 }}
    >
      <div style={{ marginBottom: 18 }}>
        <HRIllustration name="lost-signal" size={128} />
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
        Lost signal
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
        The browse view crashed — the rest of the radar is fine.
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
          Couldn&apos;t load the postings list — the query failed or the index
          didn&apos;t respond.
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
