"use client";

import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";

export interface NeverUsedEmptyProps {
  scanning: boolean;
  onRunScan: () => void;
}

/**
 * Never-used empty state: lonely-blip hero, headline, and two CTAs (Run agent
 * scan + Browse postings). Distinct from the filtered-empty line — this only
 * shows when the shortlist has zero entries at all.
 */
export function NeverUsedEmpty({ scanning, onRunScan }: NeverUsedEmptyProps) {
  const router = useRouter();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 32,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        minHeight: 330,
      }}
    >
      <span
        style={{
          font: "var(--label-mono)",
          letterSpacing: "var(--label-tracking)",
          textTransform: "uppercase",
          color: "var(--text-low)",
          marginBottom: 14,
        }}
      >
        No targets acquired
      </span>
      <HRIllustration name="lonely-blip" size={112} />
      <h3
        style={{
          margin: "14px 0 6px",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 18,
          color: "var(--text-hi)",
        }}
      >
        Your shortlist is empty
      </h3>
      <p
        style={{
          margin: "0 0 18px",
          maxWidth: 320,
          font: "var(--text-sm)",
          color: "var(--text-mid)",
        }}
      >
        Run a scan or browse the index to start tracking roles.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onRunScan}
          disabled={scanning}
          className="hr-scan-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 36,
            padding: "0 16px",
            background: "var(--violet)",
            border: "1px solid transparent",
            borderRadius: "var(--radius-control)",
            color: "#160A2E",
            font: "600 13px/1 var(--font-ui)",
            cursor: scanning ? "not-allowed" : "pointer",
            opacity: scanning ? 0.6 : 1,
            boxShadow: "var(--glow-violet)",
          }}
        >
          <Bot size={16} strokeWidth={1.5} aria-hidden />
          {scanning ? "Scanning…" : "Run agent scan"}
        </button>
        <Button variant="ghost" iconLeft="search" onClick={() => router.push("/browse")}>
          Browse postings
        </Button>
      </div>
      <style href="hr-empty-cta" precedence="medium">
        {`.hr-scan-cta:enabled:hover { background: #b9a2ff; }`}
      </style>
    </div>
  );
}

export interface FilteredEmptyProps {
  activeLabel: string;
}

/** Filtered-empty line — no illustration, no CTAs, just the message. */
export function FilteredEmpty({ activeLabel }: FilteredEmptyProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 18,
          color: "var(--text-low-content)",
        }}
      >
        Nothing in {activeLabel} — yet.
      </span>
    </div>
  );
}
