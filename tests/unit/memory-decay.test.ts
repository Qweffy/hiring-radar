import { describe, expect, it } from "vitest";

import {
  blendScore,
  effectiveStrength,
  HALF_LIFE_DAYS,
  STRENGTH_FLOOR,
} from "@/lib/memory/decay";

const NOW = new Date("2026-06-17T00:00:00Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe("effectiveStrength", () => {
  it("drops a stale, low-salience memory below the floor", () => {
    // Low intrinsic salience, untouched for many half-lives → forgotten.
    const strength = effectiveStrength(
      0.3,
      daysAgo(HALF_LIFE_DAYS * 4),
      NOW,
      0,
    );
    expect(strength).toBeLessThan(STRENGTH_FLOOR);
  });

  it("keeps a recently-recalled memory above the floor", () => {
    // Accessed just now → no decay, stays at full salience.
    const strength = effectiveStrength(0.5, NOW, NOW, 1);
    expect(strength).toBeGreaterThan(STRENGTH_FLOOR);
  });

  it("halves strength after exactly one half-life", () => {
    const fresh = effectiveStrength(0.8, NOW, NOW, 0);
    const aged = effectiveStrength(0.8, daysAgo(HALF_LIFE_DAYS), NOW, 0);
    expect(aged).toBeCloseTo(fresh / 2, 5);
  });

  it("raises strength as accessCount grows (reinforcement)", () => {
    const low = effectiveStrength(0.5, NOW, NOW, 1);
    const high = effectiveStrength(0.5, NOW, NOW, 50);
    expect(high).toBeGreaterThan(low);
  });

  it("never amplifies on a future lastAccessedAt", () => {
    const future = effectiveStrength(0.5, daysAgo(-10), NOW, 0);
    const present = effectiveStrength(0.5, NOW, NOW, 0);
    expect(future).toBeCloseTo(present, 5);
  });
});

describe("blendScore", () => {
  it("combines similarity and strength multiplicatively", () => {
    expect(blendScore(0.5, 0.8)).toBeCloseTo(0.4, 5);
  });

  it("clamps a negative cosine to zero", () => {
    expect(blendScore(-0.3, 0.9)).toBe(0);
  });

  it("clamps a cosine above 1 to the strength", () => {
    expect(blendScore(1.5, 0.7)).toBeCloseTo(0.7, 5);
  });
});
