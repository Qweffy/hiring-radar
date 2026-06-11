"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

/**
 * Destructive-confirm dialog. Red accent, restates action + object, destructive
 * button on the right, Cancel focused by default. e.g. "Discard 2 dead letters?"
 */
export interface ConfirmModalProps {
  open: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: ReactNode;
  /** @default 'Discard' */
  confirmLabel?: string;
  /** @default 'Cancel' */
  cancelLabel?: string;
  confirmIcon?: IconName;
  /** @default 'red' */
  tone?: "red" | "amber";
}

export function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  title = "Confirm",
  message,
  confirmLabel = "Discard",
  cancelLabel = "Cancel",
  confirmIcon = "alert-triangle",
  tone = "red",
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.querySelector("button")?.focus();
  }, [open]);

  const accent = tone === "amber" ? "var(--warn)" : "var(--danger)";

  return (
    <Modal
      open={open}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <span ref={cancelRef} style={{ display: "contents" }}>
            <Button variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </span>
          <Button variant="destructive" iconLeft={confirmIcon} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex" style={{ gap: 14 }}>
        <span
          className="shrink-0"
          style={{ color: accent, filter: `drop-shadow(0 0 8px ${accent})` }}
        >
          <Icon name="alert-triangle" size={20} />
        </span>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <h3 style={{ font: "var(--text-h3)", color: "var(--text-hi)" }}>{title}</h3>
          <p className="m-0" style={{ font: "var(--text-sm)", color: "var(--text-body)" }}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
}
