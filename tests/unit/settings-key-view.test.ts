import { describe, expect, it } from "vitest";

import { pickConnectedClient, toKeyView } from "@/components/settings/types";
import  { type ApiKeySummary } from "@/lib/queries/settings-mcp";

/**
 * The Settings key mapper folds a DB key summary into its display row and drives
 * the live "connected clients" indicator. These cover the load-bearing folds:
 * a read_write key shows the "read+write" badge; a never-used key reads "never";
 * a key used inside the 15-minute window counts as connected, one used outside
 * it does not; and a revoked key is struck-through + never counts as connected.
 */

const NOW = Date.UTC(2026, 5, 17, 12, 0, 0); // 2026-06-17T12:00:00Z

function key(overrides: Partial<ApiKeySummary>): ApiKeySummary {
  return {
    id: 1,
    name: "claude-desktop",
    scope: "read",
    keyPrefix: "hrk_3a9f",
    lastUsedAt: null,
    createdAt: new Date(Date.UTC(2026, 4, 12)),
    revokedAt: null,
    ...overrides,
  };
}

describe("toKeyView", () => {
  it("maps the read_write scope to the read+write badge label", () => {
    const view = toKeyView(key({ scope: "read_write" }), NOW);
    expect(view.scope).toBe("read_write");
    expect(view.scopeLabel).toBe("read+write");
  });

  it("formats a never-used key as 'never' and a recent one as a relative label", () => {
    expect(toKeyView(key({ lastUsedAt: null }), NOW).lastUsedLabel).toBe("never");

    const fourMinAgo = new Date(NOW - 4 * 60_000);
    expect(toKeyView(key({ lastUsedAt: fourMinAgo }), NOW).lastUsedLabel).toBe("4m ago");
  });

  it("marks a key used inside the 15-minute window as active, outside as not", () => {
    const inside = toKeyView(key({ lastUsedAt: new Date(NOW - 10 * 60_000) }), NOW);
    const outside = toKeyView(key({ lastUsedAt: new Date(NOW - 30 * 60_000) }), NOW);
    expect(inside.active).toBe(true);
    expect(outside.active).toBe(false);
  });

  it("renders a revoked key as struck-through and never active", () => {
    const revoked = toKeyView(
      key({ revokedAt: new Date(NOW - 60_000), lastUsedAt: new Date(NOW - 60_000) }),
      NOW,
    );
    expect(revoked.revoked).toBe(true);
    expect(revoked.active).toBe(false);
  });

  it("uses the created date in ISO YYYY-MM-DD form", () => {
    expect(toKeyView(key({ createdAt: new Date(Date.UTC(2026, 2, 1)) }), NOW).createdLabel).toBe(
      "2026-03-01",
    );
  });
});

describe("pickConnectedClient", () => {
  it("returns the first active key as the connected client", () => {
    const keys = [
      toKeyView(key({ id: 1, name: "ci-export", lastUsedAt: new Date(NOW - 2 * 60_000) }), NOW),
      toKeyView(key({ id: 2, name: "stale", lastUsedAt: new Date(NOW - 99 * 60_000) }), NOW),
    ];
    expect(pickConnectedClient(keys)).toEqual({ name: "ci-export", lastUsedLabel: "2m ago" });
  });

  it("returns null when no key is recently used", () => {
    const keys = [toKeyView(key({ lastUsedAt: null }), NOW)];
    expect(pickConnectedClient(keys)).toBeNull();
  });
});
