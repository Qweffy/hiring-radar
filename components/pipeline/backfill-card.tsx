"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { requestSweep } from "@/app/(app)/pipeline/actions";

export interface BackfillCardProps {
  /** Thread the backfill re-runs (latest known thread; null until first sweep). */
  threadId: number | null;
  /** Month string "YYYY-MM" the backfill targets. */
  month: string | null;
  /** Human range label, e.g. "JUN 2026". */
  rangeLabel: string;
  /** Approximate thread/posting counts for the confirm copy. */
  threadCount: number;
  postingEstimate: number;
}

/** Backfill card + affirmative confirm modal. Emits hn/sweep.requested. */
export function BackfillCard({
  threadId,
  month,
  rangeLabel,
  threadCount,
  postingEstimate,
}: BackfillCardProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const disabled = threadId === null || month === null;

  const start = () => {
    if (threadId === null || month === null) return;
    startTransition(async () => {
      await requestSweep({ threadId, month, trigger: "backfill" });
      setOpen(false);
    });
  };

  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: 18,
      }}
    >
      <span
        style={{
          font: "var(--label-mono)",
          letterSpacing: "var(--label-tracking)",
          textTransform: "uppercase",
          color: "var(--text-low)",
        }}
      >
        Backfill
      </span>

      {/* Range selector — static control mirroring the prototype */}
      <div
        className="flex items-center"
        style={{ gap: 10, margin: "12px 0 14px" }}
      >
        <div
          className="flex flex-1 items-center justify-between"
          style={{
            height: 36,
            padding: "0 12px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <span style={{ font: "var(--mono-sm)", color: "var(--text-hi)" }}>
            {rangeLabel}
          </span>
          <Icon
            name="chevron-down"
            size={14}
            style={{ color: "var(--text-low-content)" }}
          />
        </div>
      </div>

      <Button
        variant="secondary"
        iconLeft="database"
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{ width: "100%" }}
      >
        Backfill {rangeLabel}
      </Button>

      <p
        style={{
          margin: "12px 0 0",
          font: "var(--mono-sm)",
          color: "var(--text-low-content)",
          lineHeight: 1.5,
        }}
      >
        Embeddings are idempotent (content-hash) — safe to re-run.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              iconLeft="play"
              loading={pending}
              onClick={start}
            >
              Start backfill
            </Button>
          </>
        }
      >
        <h3 style={{ margin: "0 0 8px", font: "var(--text-h3)", color: "var(--text-hi)" }}>
          Backfill {threadCount} thread{threadCount === 1 ? "" : "s"}?
        </h3>
        <p style={{ margin: "0 0 12px", font: "var(--text-sm)", color: "var(--text-mid)" }}>
          ≈ {postingEstimate.toLocaleString("en-US")} postings · est.{" "}
          {Math.max(1, Math.round(postingEstimate / 350))} min. This runs in the
          background.
        </p>
        <div
          className="flex items-center"
          style={{
            gap: 9,
            padding: "10px 12px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <Icon name="check" size={14} style={{ color: "var(--phosphor)" }} />
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            embeddings are idempotent — safe to re-run
          </span>
        </div>
      </Modal>
    </div>
  );
}
