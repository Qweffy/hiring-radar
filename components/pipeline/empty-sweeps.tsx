"use client";

import { useTransition } from "react";

import { requestSweep } from "@/app/(app)/pipeline/actions";
import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";

export interface EmptySweepsProps {
  /** Thread to ingest on first run; null when discovery hasn't found one. */
  threadId: number | null;
  month: string | null;
  postingEstimate: number;
}

/** Fresh-install state — no sweeps yet. Kicks off the first ingest. */
export function EmptySweeps({ threadId, month, postingEstimate }: EmptySweepsProps) {
  const [pending, startTransition] = useTransition();
  const disabled = threadId === null || month === null;

  const run = () => {
    if (threadId === null || month === null) return;
    startTransition(async () => {
      await requestSweep({ threadId, month, trigger: "manual" });
    });
  };

  const estMinutes = Math.max(1, Math.round(postingEstimate / 128));

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        gap: 10,
        padding: "40px 24px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        minHeight: 300,
      }}
    >
      <HRIllustration name="empty-radar" size={100} />
      <h3
        style={{
          margin: "10px 0 4px",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 18,
          color: "var(--text-hi)",
        }}
      >
        No sweeps yet
      </h3>
      <p
        style={{
          margin: "0 0 16px",
          maxWidth: 320,
          font: "var(--text-sm)",
          color: "var(--text-mid)",
        }}
      >
        Ingest the current HN thread to populate the index — ≈
        {postingEstimate.toLocaleString("en-US")} postings · est. {estMinutes} min.
      </p>
      <Button
        variant="primary"
        iconLeft="inbox"
        loading={pending}
        disabled={disabled}
        onClick={run}
      >
        Run first ingest
      </Button>
    </div>
  );
}
