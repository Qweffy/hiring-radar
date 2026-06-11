"use client";

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

/**
 * Centered dialog on a blurred scrim. Esc closes, focus trapped, focus returns
 * to trigger on close. Backdrop click closes.
 */
export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  /** Footer node (usually right-aligned buttons). */
  footer?: ReactNode;
  /** Panel width in px. @default 460 */
  width?: number;
}

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 460,
  className,
  style,
  ...rest
}: ModalProps) {
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
      className="hr-modal-scrim fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: "var(--z-modal)",
        padding: 24,
        background: "color-mix(in srgb, var(--bg-void) 62%, transparent)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: "hr-modal-fade var(--dur) var(--ease-out)",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn("hr-modal-panel max-w-full overflow-auto outline-none", className)}
        style={{
          width,
          maxHeight: "88vh",
          background: "var(--bg-raised)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-panel)",
          animation: "hr-modal-pop var(--dur) var(--ease-out)",
          ...style,
        }}
        {...rest}
      >
        {title && (
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
        )}
        <div style={{ padding: 18 }}>{children}</div>
        {footer && (
          <div
            className="flex items-center justify-end"
            style={{ gap: 10, padding: "14px 18px", borderTop: "1px solid var(--divider)" }}
          >
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes hr-modal-fade{from{opacity:0}to{opacity:1}}
@keyframes hr-modal-pop{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.hr-modal-scrim,.hr-modal-panel{animation:none}}`}</style>
    </div>
  );
}
