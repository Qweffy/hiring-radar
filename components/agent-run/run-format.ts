import  { type StatusValue } from "@/components/ui/status-badge";
import  { type AgentRunStatus } from "@/lib/queries/agent-runs";

/** UTC "HH:MM:SS UTC" for the run's start time. */
export function utcTime(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

/** Elapsed clock "Xm 0Ys" from a whole-second count (matches the design). */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}m ${s < 10 ? `0${s}` : s}s`;
}

/** "2h ago" / "5m ago" / "3d ago" relative label for the history list. */
export function relativeTime(date: Date, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - date.getTime());
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Map a persisted run status to the StatusBadge value. */
export function statusBadge(status: AgentRunStatus): StatusValue {
  switch (status) {
    case "running":
      return "RUNNING";
    case "completed":
      return "COMPLETED";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    case "paused":
      // No PAUSED badge in the set — paused is a transient running sub-state,
      // shown with the amber PARTIAL pill in the history list.
      return "PARTIAL";
  }
}

/** USD with two decimals, e.g. "$0.27". */
export function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
