"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Cancel-run confirm dialog, matching Agent Run.dc.html exactly: a blurred
 * overlay over the run frame, a raised dialog with the run id in the title and
 * a dynamic pick count in the body, "Keep running" (ghost) and "Cancel run"
 * (destructive). Escape and overlay click both dismiss; the keep-running button
 * is focused on open.
 */
export interface CancelModalProps {
  open: boolean;
  runId: number;
  picksCount: number;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelModal({
  open,
  runId,
  picksCount,
  pending,
  onClose,
  onConfirm,
}: CancelModalProps) {
  const keepRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    keepRef.current?.querySelector("button")?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const picksLabel = `${picksCount} pick${picksCount === 1 ? "" : "s"}`;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(3,5,8,0.62)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hr-cancel-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "90%",
          background: "var(--bg-raised)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-panel)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 20px 0" }}>
          <h3
            id="hr-cancel-title"
            style={{ margin: "0 0 8px", font: "var(--text-h3)", color: "var(--text-hi)" }}
          >
            Cancel run #{runId}?
          </h3>
          <p style={{ margin: 0, font: "var(--text-sm)", color: "var(--text-mid)" }}>
            Scanning stops now. The {picksLabel} already found {picksCount === 1 ? "is" : "are"} kept;
            the run is marked cancelled.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "18px 20px",
          }}
        >
          <span ref={keepRef} style={{ display: "contents" }}>
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Keep running
            </Button>
          </span>
          <Button
            variant="destructive"
            iconLeft="close"
            onClick={onConfirm}
            loading={pending}
          >
            Cancel run
          </Button>
        </div>
      </div>
    </div>
  );
}
