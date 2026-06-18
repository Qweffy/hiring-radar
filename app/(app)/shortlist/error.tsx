"use client";

import { useEffect, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { reportClientError } from "@/lib/report-client-error";


interface ShortlistErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

const TAB: CSSProperties = {
  padding: "0 12px 10px",
  font: "500 13px/1 var(--font-ui)",
};

/**
 * Load-error boundary for the shortlist (State 07). The header and tab strip
 * stay rendered so a failed query never reads as an empty shortlist; the
 * centered panel reassures the user their picks are safe and offers Retry.
 */
export default function ShortlistError({ error, unstable_retry }: ShortlistErrorProps) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <div className="absolute inset-0 overflow-auto">
      <div style={{ padding: "26px 28px" }}>
        {/* Header — title + static Run agent scan chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 18,
              color: "var(--text-hi)",
            }}
          >
            Shortlist
          </h2>
          <span style={{ flex: 1 }} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 34,
              padding: "0 14px",
              background: "var(--violet)",
              borderRadius: "var(--radius-control)",
              color: "#160A2E",
              font: "600 12px/1 var(--font-ui)",
              boxShadow: "var(--glow-violet)",
            }}
          >
            Run agent scan
          </span>
        </div>

        {/* Tab strip stays */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 18,
            borderBottom: "1px solid var(--divider)",
          }}
        >
          <span
            style={{
              ...TAB,
              borderBottom: "2px solid var(--phosphor)",
              color: "var(--text-hi)",
            }}
          >
            All
          </span>
          <span style={{ ...TAB, color: "var(--text-mid)" }}>New</span>
          <span style={{ ...TAB, color: "var(--text-mid)" }}>Applied</span>
        </div>

        {/* Error panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 10,
            padding: 36,
            background: "var(--bg-void)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <HRIllustration name="static-interference" size={88} />
          <span style={{ font: "600 15px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
            Couldn&apos;t load your shortlist
          </span>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            the database didn&apos;t respond — your picks are safe
          </span>
          <div style={{ marginTop: 6 }}>
            <Button variant="secondary" iconLeft="retry" onClick={() => unstable_retry()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
