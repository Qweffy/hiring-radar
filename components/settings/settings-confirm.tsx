"use client";

import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

/**
 * Settings confirm dialog. Unlike the shared destructive-only ConfirmModal, this
 * supports BOTH a primary confirm (the non-destructive sweep / re-index flows)
 * and a destructive one (revoke / purge), matching the design's single modal
 * whose button variant flips per action. Destructive actions also get the amber
 * warning glyph; primary actions stay clean.
 */
export interface SettingsConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmIcon: IconName;
  /** 'destructive' adds the warning glyph + red button. @default 'primary' */
  intent?: "primary" | "destructive";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SettingsConfirm({
  open,
  title,
  message,
  confirmLabel,
  confirmIcon,
  intent = "primary",
  busy = false,
  onCancel,
  onConfirm,
}: SettingsConfirmProps) {
  const destructive = intent === "destructive";
  return (
    <Modal
      open={open}
      onClose={onCancel}
      width={440}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            iconLeft={confirmIcon}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex" style={{ gap: 14 }}>
        {destructive ? (
          <span
            className="shrink-0"
            style={{ color: "var(--danger)", filter: "drop-shadow(0 0 8px var(--danger))" }}
          >
            <Icon name="alert-triangle" size={20} />
          </span>
        ) : null}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <h3 style={{ margin: 0, font: "var(--text-h3)", color: "var(--text-hi)" }}>{title}</h3>
          <p className="m-0" style={{ font: "var(--text-sm)", color: "var(--text-body)" }}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
}
