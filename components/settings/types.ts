import { relativeTime } from "@/lib/format";
import { type ApiKeySummary } from "@/lib/queries/settings-mcp";

/** A key shaped for display in the Settings key list. */
export interface KeyView {
  id: number;
  name: string;
  scope: "read" | "read_write";
  /** Human scope label: "read" / "read+write". */
  scopeLabel: string;
  prefix: string;
  createdLabel: string;
  lastUsedLabel: string;
  /** True once revoked — the row renders struck-through + "revoked". */
  revoked: boolean;
  /** True when the key was used recently — drives the "Connected" indicator. */
  active: boolean;
}

/** A key counts as a connected client if used within this window. */
const CONNECTED_WINDOW_MS = 15 * 60_000; // 15 minutes

const SCOPE_LABELS: Record<KeyView["scope"], string> = {
  read: "read",
  read_write: "read+write",
};

/** YYYY-MM-DD — the created column matches the design's compact date. */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Map a DB key summary to its display view. `nowMs` keeps "x ago" testable. */
export function toKeyView(key: ApiKeySummary, nowMs: number): KeyView {
  const revoked = key.revokedAt !== null;
  const active =
    !revoked &&
    key.lastUsedAt !== null &&
    nowMs - key.lastUsedAt.getTime() <= CONNECTED_WINDOW_MS;

  return {
    id: key.id,
    name: key.name,
    scope: key.scope,
    scopeLabel: SCOPE_LABELS[key.scope],
    prefix: key.keyPrefix,
    createdLabel: isoDate(key.createdAt),
    lastUsedLabel:
      key.lastUsedAt === null ? "never" : relativeTime(key.lastUsedAt, new Date(nowMs)),
    revoked,
    active,
  };
}

/** The most-recently-used active key, for the "connected clients" banner. */
export interface ConnectedClient {
  name: string;
  lastUsedLabel: string;
}

export function pickConnectedClient(keys: KeyView[]): ConnectedClient | null {
  const connected = keys.find((k) => k.active);
  if (connected === undefined) return null;
  return { name: connected.name, lastUsedLabel: connected.lastUsedLabel };
}

export interface NotificationsState {
  sweep: boolean;
  agentRun: boolean;
  highMatch: boolean;
}

export interface SettingsObjectCounts {
  postings: number;
  shortlistEntries: number;
  agentRuns: number;
}
