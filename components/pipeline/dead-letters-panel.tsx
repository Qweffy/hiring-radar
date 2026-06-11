"use client";

import { useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";
import type { DeadLetterView } from "@/components/pipeline/types";
import {
  discardDeadLetter,
  retryAllDeadLetters,
  retryDeadLetter,
} from "@/app/(app)/pipeline/actions";

const cardStyle: CSSProperties = {
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
  overflow: "hidden",
};

const headerLabel: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

const stepBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  marginTop: 6,
  height: 18,
  padding: "0 6px",
  font: "600 9px/18px var(--font-mono)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--red)",
  background: "var(--red-14)",
  border: "1px solid color-mix(in srgb, var(--red) 42%, transparent)",
  borderRadius: "var(--radius-sm)",
};

function EmptyDeadLetters() {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ gap: 10, padding: "30px 24px" }}
    >
      <HRIllustration name="clean-signal" size={80} />
      <span style={{ font: "600 14px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
        No dead letters
      </span>
      <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
        Clean signal.
      </span>
    </div>
  );
}

interface DeadLetterItemProps {
  item: DeadLetterView;
  onRetry: (id: number) => void;
  onRequestDiscard: (item: DeadLetterView) => void;
  busy: boolean;
}

function DeadLetterItem({ item, onRetry, onRequestDiscard, busy }: DeadLetterItemProps) {
  const [payloadOpen, setPayloadOpen] = useState(false);

  return (
    <div
      className="flex items-start"
      style={{ gap: 16, padding: "14px 18px", borderBottom: "1px solid var(--divider)" }}
    >
      <div style={{ width: 130, flexShrink: 0 }}>
        <div style={{ font: "var(--mono-sm)", color: "var(--text-hi)" }}>{item.ref}</div>
        <span style={stepBadge}>{item.step}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div
          style={{ font: "var(--mono-sm)", color: "var(--red)", marginBottom: 7 }}
        >
          {item.error}
        </div>
        <button
          type="button"
          onClick={() => setPayloadOpen((open) => !open)}
          aria-expanded={payloadOpen}
          className="inline-flex cursor-pointer items-center border-none bg-transparent"
          style={{
            gap: 7,
            padding: "6px 10px",
            background: "var(--bg-void)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <Icon
            name="chevron-right"
            size={12}
            style={{
              color: "var(--text-low)",
              transform: payloadOpen ? "rotate(90deg)" : "none",
              transition: "transform var(--dur-fast) var(--ease-out)",
            }}
          />
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            payload preview
          </span>
        </button>
        {payloadOpen && (
          <pre
            style={{
              margin: "8px 0 0",
              padding: "10px 12px",
              background: "var(--bg-void)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              font: "var(--mono-sm)",
              color: "var(--text-mid)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {`{ "ref": "${item.ref}", "stage": "${item.step.toLowerCase()}", "error": ${JSON.stringify(
              item.error,
            )} }`}
          </pre>
        )}
      </div>

      <div className="flex shrink-0" style={{ gap: 8 }}>
        <Button
          variant="ghost"
          size="sm"
          iconLeft="retry"
          loading={busy}
          onClick={() => onRetry(item.id)}
        >
          Retry
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={() => onRequestDiscard(item)}
        >
          Discard
        </Button>
      </div>
    </div>
  );
}

export interface DeadLettersPanelProps {
  items: DeadLetterView[];
  /** Total indexed vs the latest sweep's fetched total (for the summary line). */
  indexed?: number;
  total?: number;
}

/** Dead-letters card: empty "clean signal" or a populated retry/discard list. */
export function DeadLettersPanel({ items, indexed, total }: DeadLettersPanelProps) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [discardTarget, setDiscardTarget] = useState<DeadLetterView | null>(null);

  if (items.length === 0) {
    return (
      <section style={cardStyle} aria-label="Dead letters">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--divider)" }}>
          <span style={headerLabel}>Dead letters</span>
        </div>
        <EmptyDeadLetters />
      </section>
    );
  }

  const retryOne = (id: number) => {
    setBusyId(id);
    startTransition(async () => {
      await retryDeadLetter(id);
      setBusyId(null);
    });
  };

  const retryAll = () => {
    startTransition(async () => {
      await retryAllDeadLetters();
    });
  };

  const confirmDiscard = () => {
    if (discardTarget === null) return;
    const id = discardTarget.id;
    setDiscardTarget(null);
    setBusyId(id);
    startTransition(async () => {
      await discardDeadLetter(id);
      setBusyId(null);
    });
  };

  const summaryIndexed = indexed ?? Math.max(0, (total ?? items.length) - items.length);
  const summaryTotal = total ?? summaryIndexed + items.length;

  return (
    <section style={cardStyle} aria-label="Dead letters">
      {/* Populated header — amber summary + retry-all */}
      <div
        className="flex items-center"
        style={{ gap: 12, padding: "13px 18px", borderBottom: "1px solid var(--divider)" }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--amber)",
            boxShadow: "0 0 10px var(--amber)",
            flexShrink: 0,
          }}
        />
        <span className="flex-1" style={{ font: "var(--text-sm)", color: "var(--text-hi)" }}>
          {summaryIndexed} of {summaryTotal} indexed ·{" "}
          <span style={{ color: "var(--amber)" }}>{items.length} in dead letters</span>
        </span>
        <Button
          variant="secondary"
          iconLeft="retry"
          loading={pending && busyId === null}
          onClick={retryAll}
        >
          Retry all ({items.length})
        </Button>
      </div>

      {items.map((item) => (
        <DeadLetterItem
          key={item.id}
          item={item}
          busy={busyId === item.id && pending}
          onRetry={retryOne}
          onRequestDiscard={setDiscardTarget}
        />
      ))}

      <ConfirmModal
        open={discardTarget !== null}
        title={discardTarget ? `Discard ${discardTarget.ref}?` : "Discard dead letter?"}
        message="This permanently drops the failed payload. It won't be retried."
        confirmLabel="Discard"
        onCancel={() => setDiscardTarget(null)}
        onConfirm={confirmDiscard}
      />
    </section>
  );
}
