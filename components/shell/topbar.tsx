"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { formatMonth } from "@/lib/format";

export type SweepTone = "healthy" | "syncing" | "failed";

const SWEEP_COLOR: Record<SweepTone, string> = {
  healthy: "var(--phosphor)",
  syncing: "var(--amber)",
  failed: "var(--red)",
};

export interface TopbarProps {
  /** Pipeline health — drives the status-dot color. */
  sweep: SweepTone;
  /** Mono readout under "LAST SWEEP", e.g. "06:00 UTC" or "syncing…". */
  lastSweep: string;
  /** Available thread months ("YYYY-MM", newest first) for the selector. */
  months: string[];
  onOpenPalette: () => void;
}

const DOTPING_CSS = `@keyframes hr-dotping{0%{transform:scale(1);opacity:.55}80%,100%{transform:scale(2.6);opacity:0}}
.hr-dotring{animation:hr-dotping 1.8s var(--ease-out) infinite}
@media (prefers-reduced-motion:reduce){.hr-dotring{animation:none;opacity:0}}`;

function MonthButton({ label, disabled = false }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-haspopup={disabled ? undefined : "menu"}
      aria-label={`Month in scope: ${label}`}
      className={cn(
        "flex items-center whitespace-nowrap",
        "[transition:border-color_var(--dur-fast),color_var(--dur-fast)]",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:border-[var(--border-strong)] hover:text-[var(--text-hi)]",
      )}
      style={{
        gap: 8,
        height: 34,
        padding: "0 11px",
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-control)",
        color: "var(--text-mid)",
      }}
    >
      <span style={{ font: "var(--mono-sm)", letterSpacing: "0.06em" }}>{label}</span>
      <Icon name="chevron-down" size={14} />
    </button>
  );
}

/** Writes ?month= via the router, preserving other filters. */
function MonthSelector({ months }: { months: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const latest = months[0];
  if (latest === undefined) return <MonthButton label="—" disabled />;

  const urlMonth = searchParams.get("month");
  const current = urlMonth !== null && months.includes(urlMonth) ? urlMonth : latest;

  const selectMonth = (month: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("month", month);
    params.delete("page"); // month change resets pagination
    params.delete("selected"); // …and closes a cross-month drawer selection
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Menu
      align="right"
      trigger={<MonthButton label={formatMonth(current)} />}
      items={months.map((month) => ({
        label: (
          <span style={{ font: "var(--mono-sm)", letterSpacing: "0.06em" }}>
            {formatMonth(month)}
          </span>
        ),
        onSelect: () => selectMonth(month),
      }))}
    />
  );
}

/** Glass topbar: palette trigger, sweep status, month selector, avatar. */
export function Topbar({ sweep, lastSweep, months, onOpenPalette }: TopbarProps) {
  return (
    <header
      className="relative flex shrink-0 items-center"
      style={{
        gap: 16,
        height: "var(--topbar-h)",
        padding: "0 18px",
        background: "var(--glass)",
        backdropFilter: "blur(var(--blur-glass))",
        WebkitBackdropFilter: "blur(var(--blur-glass))",
        borderBottom: "1px solid var(--divider)",
        zIndex: "var(--z-sticky)",
      }}
    >
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Scan postings — open command palette (Cmd+K)"
        aria-haspopup="dialog"
        className={cn(
          "group flex cursor-pointer items-center",
          "[transition:border-color_var(--dur-fast)]",
          "hover:border-[var(--border-strong)]",
        )}
        style={{
          width: 340,
          maxWidth: "38%",
          height: "var(--control-h)",
          gap: 9,
          padding: "0 10px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-control)",
        }}
      >
        <Icon
          name="search"
          size={16}
          className="group-hover:text-[var(--accent)] [transition:color_var(--dur-fast)]"
          style={{ color: "var(--text-low-content)" }}
        />
        <span
          className="flex-1 text-left"
          style={{ font: "var(--mono-base)", color: "var(--text-low-content)" }}
        >
          scan postings…
        </span>
        <Kbd>⌘K</Kbd>
      </button>

      <div
        className="flex shrink-0 items-center"
        title={`Pipeline ${sweep} — Pipeline view ships in M4`}
        style={{ gap: 9, height: 34, padding: "0 12px" }}
      >
        <span aria-hidden="true" className="relative" style={{ width: 8, height: 8 }}>
          <span
            className="absolute inset-0"
            style={{ borderRadius: "50%", background: SWEEP_COLOR[sweep] }}
          />
          <span
            className="hr-dotring absolute inset-0"
            style={{ borderRadius: "50%", background: SWEEP_COLOR[sweep] }}
          />
        </span>
        <span className="flex flex-col items-start" style={{ gap: 1, lineHeight: 1.1 }}>
          <span className="hr-label">Last sweep</span>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>{lastSweep}</span>
        </span>
        <span className="sr-only">{`Pipeline status: ${sweep}`}</span>
      </div>

      <div className="flex-1" />

      <Suspense fallback={<MonthButton label="—" disabled />}>
        <MonthSelector months={months} />
      </Suspense>

      <button
        type="button"
        title="Nico Mastakas"
        aria-label="Account — Nico Mastakas"
        className={cn(
          "flex shrink-0 cursor-pointer items-center justify-center",
          "[transition:border-color_var(--dur-fast)]",
          "hover:border-[var(--border-strong)]",
        )}
        style={{
          width: 32,
          height: 32,
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-control)",
        }}
      >
        <span
          style={{
            font: "600 12px/1 var(--font-mono)",
            color: "var(--text-hi)",
            letterSpacing: "0.04em",
          }}
        >
          NM
        </span>
      </button>

      <style href="hr-topbar-dotping" precedence="medium">
        {DOTPING_CSS}
      </style>
    </header>
  );
}
