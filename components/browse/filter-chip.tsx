"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";

export interface FilterOption {
  value: string;
  label: ReactNode;
}

export interface FilterChipProps {
  /** Chip text (e.g. "Remote", "JUN 2026"). */
  label: ReactNode;
  /** Leading 13px icon (e.g. clock on the month chip). */
  icon?: IconName;
  /** Active (phosphor) chip variant. */
  active?: boolean;
  /** multi = checkboxes, stays open; single = radio, closes on pick. */
  mode: "multi" | "single";
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Render option labels in mono (salary floors, months). */
  mono?: boolean;
}

export const chipButtonStyle = (active: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 30,
  padding: "0 11px",
  background: active ? "var(--phosphor-08)" : "transparent",
  border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
  borderRadius: "var(--radius-control)",
  font: "var(--mono-sm)",
  color: active ? "var(--phosphor)" : "var(--text-mid)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "border-color var(--dur-fast), background var(--dur-fast)",
});

/** Toolbar dropdown chip — multi-check or single-pick filter trigger. */
export function FilterChip({
  label,
  icon,
  active = false,
  mode,
  options,
  selected,
  onChange,
  mono = false,
}: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const toggleValue = (value: string) => {
    if (mode === "single") {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "hover:[border-color:var(--border-strong)]",
          active && "hover:[border-color:var(--border-strong)]",
        )}
        style={chipButtonStyle(active)}
      >
        {icon ? <Icon name={icon} size={13} /> : null}
        {label}
        <Icon name="chevron-down" size={13} style={{ opacity: 0.6 }} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full"
          style={{
            zIndex: "var(--z-dropdown)",
            marginTop: 6,
            minWidth: 180,
            maxHeight: 280,
            overflowY: "auto",
            padding: 6,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-control)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role={mode === "multi" ? "menuitemcheckbox" : "menuitemradio"}
                aria-checked={isSelected}
                onClick={() => toggleValue(opt.value)}
                className="flex w-full cursor-pointer items-center text-left hover:bg-[color-mix(in_srgb,var(--text-mid)_8%,transparent)]"
                style={{
                  gap: 8,
                  padding: "7px 10px",
                  background: "transparent",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  font: mono ? "var(--mono-sm)" : "var(--text-sm)",
                  color: isSelected ? "var(--text-hi)" : "var(--text-mid)",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  className="inline-flex shrink-0 items-center justify-center"
                  style={{ width: 14, height: 14 }}
                  aria-hidden="true"
                >
                  {isSelected ? (
                    <Icon name="check" size={13} style={{ color: "var(--phosphor)" }} />
                  ) : null}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </span>
  );
}
