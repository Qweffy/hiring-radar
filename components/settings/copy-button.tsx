"use client";

import { useCallback, useState } from "react";

import { Icon } from "@/components/ui/icon";

/**
 * Copy-to-clipboard control. Flips to a phosphor "Copied" check for ~1.6s, then
 * reverts. Clipboard can reject (insecure context / denied permission), so the
 * write is guarded and a failure just leaves the label unchanged — never throws.
 */
export interface CopyButtonProps {
  /** The text to write to the clipboard. */
  value: string;
  /** Accessible label / tooltip for the control. */
  label: string;
  /** Render compact (icon-only square) vs. labelled inline. @default false */
  iconOnly?: boolean;
}

const RESET_MS = 1600;

export function CopyButton({ value, label, iconOnly = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(() => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), RESET_MS);
      })
      .catch(() => {
        // Clipboard unavailable (insecure context / denied) — no-op, the value
        // stays visible for a manual copy.
      });
  }, [value]);

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={onCopy}
        aria-label={label}
        title={label}
        className="inline-flex cursor-pointer items-center justify-center border bg-transparent"
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderColor: "var(--border)",
          borderRadius: "var(--radius-sm)",
          color: copied ? "var(--phosphor)" : "var(--text-low-content)",
        }}
      >
        <Icon name={copied ? "check" : "copy"} size={14} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className="inline-flex cursor-pointer items-center border-none bg-transparent p-0"
      style={{
        gap: 6,
        font: "var(--mono-sm)",
        color: copied ? "var(--phosphor)" : "var(--cyan)",
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={13} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
