"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

export interface CommandItem {
  id: string;
  label: string;
  icon?: IconName;
  /** Mono shortcut/hint shown at right. */
  hint?: string;
}

export interface CommandGroup {
  label: string;
  items: CommandItem[];
}

/**
 * ⌘K command palette: glass panel, mono input, grouped + filterable results,
 * arrow-key nav, and a no-results state that falls through to posting search.
 */
export interface CommandPaletteProps {
  open: boolean;
  onClose?: () => void;
  groups: CommandGroup[];
  placeholder?: string;
  onSelect?: (item: CommandItem) => void;
  /** Called on Enter when there are no matches. */
  onSearchFallback?: (query: string) => void;
}

interface IndexedGroup {
  label: string;
  items: { item: CommandItem; index: number }[];
}

export function CommandPalette(props: CommandPaletteProps) {
  // Mounting the panel only while open resets query/active state on every open.
  if (!props.open) return null;
  return <CommandPalettePanel {...props} />;
}

function CommandPalettePanel({
  onClose,
  groups,
  placeholder = "Type a command or search…",
  onSelect,
  onSearchFallback,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const { visible, flat } = useMemo(() => {
    const q = query.toLowerCase();
    const indexed: IndexedGroup[] = [];
    const all: CommandItem[] = [];
    for (const group of groups) {
      const matches = group.items.filter((item) => item.label.toLowerCase().includes(q));
      if (matches.length === 0) continue;
      indexed.push({
        label: group.label,
        items: matches.map((item) => ({ item, index: all.push(item) - 1 })),
      });
    }
    return { visible: indexed, flat: all };
  }, [groups, query]);

  const activeIndex = Math.min(active, Math.max(0, flat.length - 1));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => Math.min(flat.length - 1, current + 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => Math.max(0, current - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = flat[Math.min(activeIndex, flat.length - 1)];
        if (item) onSelect?.(item);
        else onSearchFallback?.(query);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flat, activeIndex, query, onClose, onSelect, onSearchFallback]);

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      className="fixed inset-0 flex items-start justify-center"
      style={{
        zIndex: "var(--z-palette)",
        paddingTop: "14vh",
        background: "color-mix(in srgb, var(--bg-void) 55%, transparent)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="hr-palette-panel flex flex-col overflow-hidden"
        style={{
          width: 560,
          maxWidth: "92vw",
          maxHeight: "64vh",
          background: "var(--glass)",
          backdropFilter: "blur(var(--blur-glass))",
          WebkitBackdropFilter: "blur(var(--blur-glass))",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-panel), var(--glow-phosphor-sm)",
          animation: "hr-palette-pop var(--dur) var(--ease-out)",
        }}
      >
        <div
          className="flex items-center"
          style={{ gap: 10, padding: "13px 16px", borderBottom: "1px solid var(--divider)" }}
        >
          <Icon name="command" size={20} style={{ color: "var(--accent)" }} />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder={placeholder}
            className="flex-1 border-none bg-transparent outline-none"
            style={{ color: "var(--text-hi)", font: "var(--mono-base)" }}
          />
          <kbd
            style={{
              font: "var(--mono-sm)",
              color: "var(--text-low-content)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "2px 6px",
            }}
          >
            ESC
          </kbd>
        </div>
        <div className="flex-1 overflow-auto" style={{ padding: 6 }}>
          {flat.length === 0 ? (
            <div className="text-center" style={{ padding: "28px 16px" }}>
              <p className="m-0" style={{ font: "var(--text-sm)", color: "var(--text-body)" }}>
                No matches for{" "}
                <span style={{ font: "var(--mono-sm)", color: "var(--text-hi)" }}>
                  &quot;{query}&quot;
                </span>
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  font: "var(--mono-sm)",
                  color: "var(--text-low-content)",
                }}
              >
                Press <kbd style={{ color: "var(--accent)" }}>Enter</kbd> to search postings
                instead
              </p>
            </div>
          ) : (
            visible.map((group) => (
              <div key={group.label} style={{ marginBottom: 4 }}>
                <div
                  className="uppercase"
                  style={{
                    padding: "8px 10px 4px",
                    font: "var(--label-mono)",
                    letterSpacing: "var(--label-tracking)",
                    color: "var(--text-label)",
                  }}
                >
                  {group.label}
                </div>
                {group.items.map(({ item, index }) => {
                  const current = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => onSelect?.(item)}
                      className="flex w-full cursor-pointer items-center border-none text-left"
                      style={{
                        gap: 10,
                        padding: "8px 10px",
                        background: current ? "var(--phosphor-12)" : "transparent",
                        borderRadius: "var(--radius-sm)",
                        color: current ? "var(--text-hi)" : "var(--text-body)",
                        font: "var(--text-sm)",
                      }}
                    >
                      {item.icon && (
                        <Icon
                          name={item.icon}
                          size={16}
                          style={{ color: current ? "var(--accent)" : "var(--text-low-content)" }}
                        />
                      )}
                      <span className="flex-1">{item.label}</span>
                      {item.hint && (
                        <kbd style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
                          {item.hint}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <style>{`@keyframes hr-palette-pop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.hr-palette-panel{animation:none}}`}</style>
      </div>
    </div>
  );
}
