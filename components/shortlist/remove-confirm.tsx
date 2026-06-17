"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export interface RemoveConfirmProps {
  open: boolean;
  company: string;
  removing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive remove-confirm dialog. Overlays the shortlist content (absolute,
 * not the viewport) with a blur(4px) scrim, restates the company and that the
 * action is permanent, and focuses Cancel by default. Escape cancels.
 */
export function RemoveConfirm({
  open,
  company,
  removing,
  onCancel,
  onConfirm,
}: RemoveConfirmProps) {
  const cancelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.querySelector("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hr-remove-title"
      onClick={onCancel}
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
        onClick={(event) => event.stopPropagation()}
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
            id="hr-remove-title"
            style={{ margin: "0 0 8px", font: "var(--text-h3)", color: "var(--text-hi)" }}
          >
            Remove from shortlist?
          </h3>
          <p style={{ margin: 0, font: "var(--text-sm)", color: "var(--text-mid)" }}>
            This removes{" "}
            <span style={{ color: "var(--text-hi)" }}>{company}</span> and its notes.
            This can&apos;t be undone.
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
          <span ref={cancelRef} style={{ display: "contents" }}>
            <Button variant="ghost" onClick={onCancel} disabled={removing}>
              Cancel
            </Button>
          </span>
          <Button
            variant="destructive"
            iconLeft="close"
            onClick={onConfirm}
            loading={removing}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
