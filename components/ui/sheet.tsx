"use client";

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Bottom sheet — the mobile stand-in for a desktop dropdown / menu / confirm.
 * Scrim + grab handle, slides up from the bottom edge. Esc / scrim closes;
 * focus is trapped. Modeled on `components/ui/drawer.tsx`. */
export interface SheetProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  style,
  ...rest
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
        const head = items[0];
        const tail = items[items.length - 1];
        if (head === undefined || tail === undefined) return;
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
      className="fixed inset-0 flex items-end justify-center"
      style={{
        zIndex: "var(--z-modal)",
        background: "rgba(3, 5, 8, 0.55)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn("hr-sheet-panel flex w-full flex-col outline-none", className)}
        style={{
          maxWidth: 520,
          maxHeight: "86dvh",
          padding: "8px 18px calc(22px + env(safe-area-inset-bottom))",
          background: "var(--bg-raised)",
          borderTop: "1px solid var(--border-strong)",
          borderRadius: "18px 18px 0 0",
          boxShadow: "var(--shadow-panel)",
          animation: "hr-sheet-up var(--dur-slow) var(--ease-out)",
          ...style,
        }}
        {...rest}
      >
        <div
          aria-hidden
          style={{
            width: 38,
            height: 4,
            borderRadius: 2,
            background: "var(--border-strong)",
            margin: "8px auto 16px",
            flexShrink: 0,
          }}
        />
        {title !== undefined && (
          <div
            style={{
              font: "600 15px/1.2 var(--font-ui)",
              color: "var(--text-hi)",
              marginBottom: 14,
            }}
          >
            {title}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        {footer !== undefined && (
          <div className="flex" style={{ gap: 10, marginTop: 16 }}>
            {footer}
          </div>
        )}
      </div>
      <style href="hr-sheet" precedence="medium">
        {`@keyframes hr-sheet-up{from{transform:translateY(100%)}to{transform:none}}
@media (prefers-reduced-motion: reduce){.hr-sheet-panel{animation:none}}`}
      </style>
    </div>
  );
}
