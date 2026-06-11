"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

/** The primary scan field: mono placeholder, ⌘K hint, optional clear button. */
export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** @default 'scan postings…' */
  placeholder?: string;
  /** Keycap hint shown at right when empty. @default '⌘K' */
  hint?: string;
  /** When provided and value is non-empty, shows a clear (×) button. */
  onClear?: () => void;
  /** @default 'md' */
  size?: "md" | "lg";
}

const SEARCH_CSS = `
.hr-search {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  transition: border-color var(--dur-fast), box-shadow var(--dur);
}
.hr-search:focus-within {
  border-color: var(--border-strong);
  box-shadow: var(--glow-phosphor-sm);
}
.hr-search .hr-search-icon {
  color: var(--text-low-content);
  transition: color var(--dur-fast);
}
.hr-search:focus-within .hr-search-icon {
  color: var(--phosphor);
}
.hr-search input::-webkit-search-cancel-button,
.hr-search input::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}
@media (prefers-reduced-motion: reduce) {
  .hr-search, .hr-search .hr-search-icon { transition: none; }
}
`;

export function SearchInput({
  value,
  placeholder = "scan postings…",
  hint = "⌘K",
  onClear,
  size = "md",
  className,
  style,
  ...rest
}: SearchInputProps): React.JSX.Element {
  const hasValue = value != null && String(value).length > 0;
  return (
    <div
      className={cn("hr-search flex w-full items-center", className)}
      style={{
        gap: 10,
        height: size === "lg" ? "var(--control-h-lg)" : "var(--control-h)",
        padding: "0 10px 0 12px",
        ...style,
      }}
    >
      <style href="hr-search" precedence="medium">
        {SEARCH_CSS}
      </style>
      <Search className="hr-search-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-hi)",
          font: "var(--mono-base)",
        }}
        {...rest}
      />
      {hasValue && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear"
          className="inline-flex cursor-pointer"
          style={{
            background: "none",
            border: "none",
            padding: 4,
            color: "var(--text-low-content)",
          }}
        >
          <X size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ) : (
        hint && (
          <kbd
            style={{
              font: "600 11px/1 var(--font-mono)",
              color: "var(--text-low-content)",
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 6px",
            }}
          >
            {hint}
          </kbd>
        )
      )}
    </div>
  );
}
