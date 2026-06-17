"use client";

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Side panel sliding in from the right/left. Esc closes; focus trapped. */
export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** @default 'right' */
  side?: "right" | "left";
  /** Width in px. @default 440 */
  width?: number;
}

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
  width = 440,
  className,
  style,
  ...rest
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusables = (): HTMLElement[] =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    const first = focusables()[0];
    if (first) first.focus();
    else panel?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const head = items[0];
        const tail = items[items.length - 1];
        if (event.shiftKey && document.activeElement === head) {
          event.preventDefault();
          tail.focus();
        } else if (!event.shiftKey && document.activeElement === tail) {
          event.preventDefault();
          head.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      className={cn("fixed inset-0 flex", side === "right" ? "justify-end" : "justify-start")}
      style={{
        zIndex: "var(--z-drawer)",
        background: "color-mix(in srgb, var(--bg-void) 50%, transparent)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn("hr-drawer-panel flex h-full flex-col outline-none", className)}
        style={{
          width,
          maxWidth: "94vw",
          background: "var(--bg-surface)",
          borderLeft: side === "right" ? "1px solid var(--border-strong)" : "none",
          borderRight: side === "left" ? "1px solid var(--border-strong)" : "none",
          boxShadow: "var(--shadow-panel)",
          animation: `hr-drawer-slide-${side} var(--dur-slow) var(--ease-out)`,
          ...style,
        }}
        {...rest}
      >
        <div
          className="flex items-center justify-between gap-3"
          style={{ padding: "14px 18px", borderBottom: "1px solid var(--divider)" }}
        >
          <h3 style={{ font: "var(--text-h3)", color: "var(--text-hi)" }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer border-none bg-transparent"
            style={{ padding: 4, color: "var(--text-low-content)" }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto" style={{ padding: 18 }}>
          {children}
        </div>
        {footer && (
          <div
            className="flex justify-end"
            style={{ gap: 10, padding: "14px 18px", borderTop: "1px solid var(--divider)" }}
          >
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes hr-drawer-slide-right{from{transform:translateX(100%)}to{transform:none}}
@keyframes hr-drawer-slide-left{from{transform:translateX(-100%)}to{transform:none}}
@media (prefers-reduced-motion: reduce){.hr-drawer-panel{animation:none}}`}</style>
    </div>
  );
}
