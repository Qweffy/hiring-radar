import { describe, expect, it } from "vitest";

import { formatMonth, formatSalary, relativeTime } from "@/lib/format";

describe("relativeTime", () => {
  const now = new Date("2026-06-11T12:00:00Z");
  it("formats minutes, hours and days", () => {
    expect(relativeTime(new Date("2026-06-11T11:58:00Z"), now)).toBe("2m ago");
    expect(relativeTime(new Date("2026-06-11T09:00:00Z"), now)).toBe("3h ago");
    expect(relativeTime(new Date("2026-06-09T09:00:00Z"), now)).toBe("2d ago");
  });
  it("falls back to a date after 30 days", () => {
    expect(relativeTime(new Date("2026-01-01T00:00:00Z"), now)).toBe("2026-01-01");
  });
});

describe("formatSalary", () => {
  it("formats ranges with k-notation", () => {
    expect(formatSalary(160000, 195000, "USD")).toBe("$160k–$195k");
    expect(formatSalary(95000, 120000, "EUR")).toBe("€95k–€120k");
  });
  it("formats a single value and single-ended ranges", () => {
    expect(formatSalary(150000, 150000, "USD")).toBe("$150k");
    expect(formatSalary(150000, null, "USD")).toBe("$150k+");
    expect(formatSalary(null, 90000, "GBP")).toBe("up to £90k");
  });
  it("returns an em dash when nothing is stated", () => {
    expect(formatSalary(null, null, null)).toBe("—");
  });
  it("falls back to the code for unknown currencies", () => {
    expect(formatSalary(100000, null, "CHF")).toBe("CHF 100k+");
  });
});

describe("formatMonth", () => {
  it("formats YYYY-MM as MON YYYY", () => {
    expect(formatMonth("2026-06")).toBe("JUN 2026");
    expect(formatMonth("2025-12")).toBe("DEC 2025");
  });
});
