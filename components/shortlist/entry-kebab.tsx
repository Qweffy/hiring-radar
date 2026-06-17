"use client";

import { ExternalLink, RotateCw, X } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";

import { IconButton } from "@/components/ui/icon-button";

export interface EntryKebabProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  hnUrl: string;
  onReassess: () => void;
  onRemove: () => void;
}

const ITEM_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "8px 10px",
  borderRadius: "var(--radius-sm)",
  font: "var(--text-sm)",
  background: "transparent",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
};

/**
 * Per-card overflow menu. The IconButton toggles; the popover anchors to it and
 * closes on outside-click or Escape. Open on HN / Re-assess use phosphor hover;
 * Remove is separated and red, opening the destructive confirm modal.
 */
export function EntryKebab({
  open,
  onToggle,
  onClose,
  hnUrl,
  onReassess,
  onRemove,
}: EntryKebabProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconButton icon="kebab" label="More" onClick={onToggle} active={open} />
      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: 40,
            zIndex: 50,
            width: 170,
            padding: 5,
            background: "var(--bg-raised)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-control)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <a
            href={hnUrl}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={onClose}
            className="hr-kebab-item"
            style={{ ...ITEM_BASE, color: "var(--text-mid)", textDecoration: "none" }}
          >
            <ExternalLink size={14} strokeWidth={1.5} aria-hidden style={{ flexShrink: 0 }} />
            Open on HN
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onReassess();
              onClose();
            }}
            className="hr-kebab-item"
            style={{ ...ITEM_BASE, color: "var(--text-mid)" }}
          >
            <RotateCw size={14} strokeWidth={1.5} aria-hidden style={{ flexShrink: 0 }} />
            Re-assess
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onRemove}
            className="hr-kebab-item-danger"
            style={{
              ...ITEM_BASE,
              borderTop: "1px solid var(--divider)",
              marginTop: 3,
              color: "var(--red)",
            }}
          >
            <X size={14} strokeWidth={1.5} aria-hidden style={{ flexShrink: 0 }} />
            Remove
          </button>
          <style href="hr-kebab" precedence="medium">
            {`.hr-kebab-item:hover { background: var(--phosphor-08); }
.hr-kebab-item-danger:hover { background: var(--red-14); }`}
          </style>
        </div>
      ) : null}
    </div>
  );
}
