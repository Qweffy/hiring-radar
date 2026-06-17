"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ShellCommandPalette } from "@/components/shell/shell-command-palette";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar, type SweepTone } from "@/components/shell/topbar";

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
      <Sidebar />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Topbar
          sweep={sweep}
          lastSweep={lastSweep}
          months={months}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="hr-void relative min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
      <ShellCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        months={months}
      />
    </div>
  );
}
