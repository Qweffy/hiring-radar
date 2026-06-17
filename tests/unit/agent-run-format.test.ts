import { describe, expect, it } from "vitest";

import {
  formatElapsed,
  relativeTime,
  statusBadge,
  usd,
  utcTime,
} from "@/components/agent-run/run-format";

describe("formatElapsed", () => {
  it("formats as 'Xm 0Ys' with a zero-padded seconds field", () => {
    expect(formatElapsed(138)).toBe("2m 18s");
    expect(formatElapsed(5)).toBe("0m 05s");
    expect(formatElapsed(60)).toBe("1m 00s");
    expect(formatElapsed(0)).toBe("0m 00s");
  });

  it("clamps a negative count to zero", () => {
    expect(formatElapsed(-10)).toBe("0m 00s");
  });
});

describe("relativeTime", () => {
  const now = Date.UTC(2026, 5, 17, 12, 0, 0);
  it("renders minutes, hours, and days ago", () => {
    expect(relativeTime(new Date(now - 30_000), now)).toBe("just now");
    expect(relativeTime(new Date(now - 5 * 60_000), now)).toBe("5m ago");
    expect(relativeTime(new Date(now - 2 * 3_600_000), now)).toBe("2h ago");
    expect(relativeTime(new Date(now - 3 * 86_400_000), now)).toBe("3d ago");
  });
});

describe("statusBadge", () => {
  it("maps run statuses to the badge set (paused → amber PARTIAL)", () => {
    expect(statusBadge("running")).toBe("RUNNING");
    expect(statusBadge("completed")).toBe("COMPLETED");
    expect(statusBadge("failed")).toBe("FAILED");
    expect(statusBadge("cancelled")).toBe("CANCELLED");
    expect(statusBadge("paused")).toBe("PARTIAL");
  });
});

describe("usd / utcTime", () => {
  it("formats USD with two decimals", () => {
    expect(usd(0.27)).toBe("$0.27");
    expect(usd(1)).toBe("$1.00");
  });

  it("formats a UTC HH:MM:SS clock", () => {
    expect(utcTime(new Date(Date.UTC(2026, 5, 17, 6, 0, 14)))).toBe("06:00:14 UTC");
  });
});
