"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { MobileHeader } from "@/components/shell/mobile-header";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { MoreSheet } from "@/components/shell/more-sheet";
import { ShellCommandPalette } from "@/components/shell/shell-command-palette";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar, type SweepTone } from "@/components/shell/topbar";

// Desktop chrome (sidebar + glass topbar) and mobile chrome (header + tab bar)
// both render; CSS media queries show exactly one. CSS-toggling keeps it
// flash-free across SSR/hydration — no JS viewport check for the layout spine.
const SHELL_RESPONSIVE_CSS = `.hr-mobile-chrome{display:none}
@media (max-width:768px){
  .hr-sidebar-slot{display:none!important}
  .hr-topbar-slot{display:none!important}
  .hr-mobile-chrome{display:flex}
}`;

export type { SweepTone };

export interface RadarShellProps {
  sweep: SweepTone;
  lastSweep: string;
  /** Available thread months ("YYYY-MM", newest first). */
  months: string[];
  children: ReactNode;
}

const CHORD_WINDOW_MS = 1200;

/** Chord targets for live routes — the rest arm as their screens land. */
const CHORDS: Record<string, string> = {
  d: "/", // Radar
  b: "/browse",
  s: "/shortlist",
  r: "/agent",
  u: "/profile",
  p: "/pipeline",
  ",": "/settings",
  e: "/diagnostics",
};

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable);

/**
 * Persistent app chrome: sidebar, glass topbar, .hr-void content slot and the
 * ⌘K command palette. Global keys: ⌘K toggles the palette; "g" chords navigate.
 */
export function RadarShell({ sweep, lastSweep, months, children }: RadarShellProps) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const chordArmed = useRef(false);
  const chordTimer = useRef<number | null>(null);

  useEffect(() => {
    const disarm = () => {
      chordArmed.current = false;
      if (chordTimer.current !== null) {
        window.clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        disarm();
        setPaletteOpen((open) => !open);
        return;
      }
      // Chords never fire while typing (the palette input is autofocused).
      if (event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
      if (chordArmed.current) {
        disarm();
        const target = CHORDS[event.key];
        if (target !== undefined) router.push(target);
        return;
      }
      if (event.key === "g") {
        chordArmed.current = true;
        chordTimer.current = window.setTimeout(disarm, CHORD_WINDOW_MS);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      disarm();
    };
  }, [router]);

  return (
    <div
      className="flex h-dvh w-full overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        color: "var(--text-mid)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <span className="hr-sidebar-slot" style={{ display: "contents" }}>
        <Sidebar />
      </span>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <span className="hr-topbar-slot" style={{ display: "contents" }}>
          <Topbar
            sweep={sweep}
            lastSweep={lastSweep}
            months={months}
            onOpenPalette={() => setPaletteOpen(true)}
          />
        </span>
        <MobileHeader onOpenMore={() => setMoreOpen(true)} />
        <main className="hr-void relative min-h-0 flex-1 overflow-hidden">{children}</main>
        <MobileTabBar onOpenMore={() => setMoreOpen(true)} moreOpen={moreOpen} />
      </div>
      <ShellCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        months={months}
      />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <style href="hr-shell-responsive" precedence="medium">
        {SHELL_RESPONSIVE_CSS}
      </style>
    </div>
  );
}
