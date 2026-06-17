"use client";

import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label?: ReactNode;
  icon?: IconName;
  /** Red destructive styling. */
  danger?: boolean;
  /** Mono shortcut hint at right. */
  shortcut?: string;
  onSelect?: () => void;
  /** Render a divider instead of an item. */
  divider?: boolean;
}

/** Dropdown menu anchored below `trigger`. Closes on outside-click / Esc. */
export interface MenuProps extends HTMLAttributes<HTMLSpanElement> {
  trigger: ReactNode;
  items: MenuItem[];
  /** @default 'left' */
  align?: "left" | "right";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Menu({
  trigger,
  items,
  align = "left",
  open: controlledOpen,
  onOpenChange,
  className,
  style,
  ...rest
}: MenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const rootRef = useRef<HTMLSpanElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
    };
    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open, setOpen]);

  return (
    <span
      ref={rootRef}
      className={cn("relative inline-flex", className)}
      style={style}
      {...rest}
    >
      <span onClick={() => setOpen(!open)}>{trigger}</span>
      {open && (
        <div
          role="menu"
          className="absolute top-full"
          style={{
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            marginTop: 6,
            zIndex: "var(--z-dropdown)",
            minWidth: 184,
            padding: 5,
            background: "var(--bg-raised)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-control)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          {items.map((item, index) =>
            item.divider ? (
              <div
                key={index}
                role="separator"
                style={{ height: 1, background: "var(--divider)", margin: "5px 0" }}
              />
            ) : (
              <button
                key={index}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
                className={cn("hr-menu-item", item.danger && "hr-menu-item-danger")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "7px 8px",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  font: "var(--text-sm)",
                  textAlign: "left",
                }}
              >
                {item.icon && <Icon name={item.icon} size={16} />}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <kbd style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            ),
          )}
          <style>{`.hr-menu-item{background:transparent;color:var(--text-body)}
.hr-menu-item-danger{color:var(--danger)}
.hr-menu-item:hover{background:var(--phosphor-08);color:var(--text-hi)}
.hr-menu-item-danger:hover{background:var(--red-14)}`}</style>
        </div>
      )}
    </span>
  );
}
