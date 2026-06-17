"use client";

import { Button } from "@/components/ui/button";

interface DirtyBarProps {
  onSave: () => void;
  onDiscard?: () => void;
  saving?: boolean;
}

/**
 * Sticky glass bar that surfaces unsaved calibration edits. Anchored to the
 * bottom of the scroll container; "Discard" is omitted when no handler is given
 * (the save-error rendering drops it, keeping only the Save retry).
 */
export function DirtyBar({ onSave, onDiscard, saving = false }: DirtyBarProps) {
  return (
    <div
      role="status"
      style={{
        position: "sticky",
        bottom: 18,
        zIndex: 5,
        margin: "0 10px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-control)",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--amber)",
          boxShadow: "0 0 8px var(--amber)",
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-hi)" }}>
        Unsaved calibration changes
      </span>
      {onDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          className="cursor-pointer border-none bg-transparent p-0"
          style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
        >
          Discard
        </button>
      )}
      <Button variant="primary" size="sm" onClick={onSave} loading={saving}>
        Save
      </Button>
    </div>
  );
}
