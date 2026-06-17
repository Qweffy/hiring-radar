import  { type ReactNode } from "react";

import { RadarShell, type SweepTone } from "@/components/shell/radar-shell";
import {
  getAvailableMonths,
  getLatestSweep,
  type SweepSummary,
} from "@/lib/queries/sweeps";


function sweepTone(sweep: SweepSummary | null): SweepTone {
  if (sweep === null) return "syncing"; // no sweep yet — amber until first run
  switch (sweep.status) {
    case "failed":
      return "failed";
    case "running":
    case "partial": // degraded fetch — amber warning dot
      return "syncing";
    default:
      return "healthy";
  }
}

function lastSweepLabel(sweep: SweepSummary | null): string {
  if (sweep === null) return "—";
  if (sweep.status === "running") return "syncing…";
  const at = sweep.finishedAt ?? sweep.startedAt;
  const hh = String(at.getUTCHours()).padStart(2, "0");
  const mm = String(at.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

/**
 * App shell layout. Two tiny warm queries run uncached on every request —
 * acceptable for M1; M4 (pipeline) will revisit caching with 'use cache' +
 * cacheTag so this becomes a tagged read invalidated by ingestion.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [sweep, months] = await Promise.all([getLatestSweep(), getAvailableMonths()]);

  return (
    <RadarShell sweep={sweepTone(sweep)} lastSweep={lastSweepLabel(sweep)} months={months}>
      {children}
    </RadarShell>
  );
}
