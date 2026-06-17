import { describe, expect, it } from "vitest";

import {
  CATEGORIES,
  CATEGORY_ANGLE,
  CENTER,
  blipAngle,
  blipFillOpacity,
  classifyCategory,
  clusterSpread,
  matchToRadius,
  polarToCartesian,
  recencyToScore,
  salaryToTier,
  scoreToMatchLevel,
  tierToDiameter,
  toRadians,
} from "@/lib/radar";

describe("toRadians", () => {
  it("converts degrees to radians", () => {
    expect(toRadians(0)).toBe(0);
    expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 10);
  });
});

describe("polarToCartesian", () => {
  it("places 0° straight up from center", () => {
    const { x, y } = polarToCartesian(100, 0);
    expect(x).toBeCloseTo(CENTER, 6);
    expect(y).toBeCloseTo(CENTER - 100, 6);
  });

  it("places 90° to the right (clockwise)", () => {
    const { x, y } = polarToCartesian(100, 90);
    expect(x).toBeCloseTo(CENTER + 100, 6);
    expect(y).toBeCloseTo(CENTER, 6);
  });

  it("places 180° straight down", () => {
    const { x, y } = polarToCartesian(100, 180);
    expect(x).toBeCloseTo(CENTER, 6);
    expect(y).toBeCloseTo(CENTER + 100, 6);
  });

  it("places 270° to the left", () => {
    const { x, y } = polarToCartesian(100, 270);
    expect(x).toBeCloseTo(CENTER - 100, 6);
    expect(y).toBeCloseTo(CENTER, 6);
  });

  it("honors a custom center", () => {
    const { x, y } = polarToCartesian(50, 0, 10, 20);
    expect(x).toBeCloseTo(10, 6);
    expect(y).toBeCloseTo(20 - 50, 6);
  });
});

describe("matchToRadius", () => {
  it("maps match 100 to the inner radius (40)", () => {
    expect(matchToRadius(100)).toBeCloseTo(40, 6);
  });

  it("maps match 0 to the outer radius (200)", () => {
    expect(matchToRadius(0)).toBeCloseTo(200, 6);
  });

  it("is linear at the midpoint", () => {
    expect(matchToRadius(50)).toBeCloseTo(120, 6);
  });

  it("clamps out-of-range scores", () => {
    expect(matchToRadius(140)).toBeCloseTo(40, 6);
    expect(matchToRadius(-20)).toBeCloseTo(200, 6);
  });
});

describe("clusterSpread", () => {
  it("tightens DevOps and Other to 18°", () => {
    expect(clusterSpread("DevOps")).toBe(18);
    expect(clusterSpread("Other")).toBe(18);
  });

  it("uses 26° for the rest", () => {
    expect(clusterSpread("Frontend")).toBe(26);
    expect(clusterSpread("AI-ML")).toBe(26);
  });
});

describe("blipAngle", () => {
  it("centers a single blip on its cluster angle", () => {
    expect(blipAngle("Full-stack", 0, 1)).toBeCloseTo(CATEGORY_ANGLE["Full-stack"], 6);
  });

  it("spreads symmetrically across a 2-blip cluster", () => {
    const center = CATEGORY_ANGLE["Frontend"];
    const a0 = blipAngle("Frontend", 0, 2);
    const a1 = blipAngle("Frontend", 1, 2);
    expect((a0 + a1) / 2).toBeCloseTo(center, 6);
    expect(a1).toBeGreaterThan(a0);
  });

  it("keeps blips inside the cluster spread", () => {
    const center = CATEGORY_ANGLE["Backend"];
    const spread = clusterSpread("Backend");
    for (let i = 0; i < 7; i++) {
      const a = blipAngle("Backend", i, 7);
      expect(a).toBeGreaterThanOrEqual(center - spread);
      expect(a).toBeLessThanOrEqual(center + spread);
    }
  });

  it("treats a zero-size cluster as size 1 without dividing by zero", () => {
    expect(Number.isFinite(blipAngle("Other", 0, 0))).toBe(true);
  });
});

describe("salaryToTier / tierToDiameter", () => {
  it("bands salaries into tiers", () => {
    expect(salaryToTier(null)).toBe("small");
    expect(salaryToTier(120_000)).toBe("small");
    expect(salaryToTier(140_000)).toBe("small");
    expect(salaryToTier(150_000)).toBe("med");
    expect(salaryToTier(175_000)).toBe("med");
    expect(salaryToTier(185_000)).toBe("large");
    expect(salaryToTier(220_000)).toBe("large");
  });

  it("maps tiers to dot diameters", () => {
    expect(tierToDiameter("small")).toBe(9);
    expect(tierToDiameter("med")).toBe(12);
    expect(tierToDiameter("large")).toBe(15);
  });
});

describe("recencyToScore", () => {
  it("scores the newest at 100 and the oldest at 0", () => {
    expect(recencyToScore(200, 100, 200)).toBe(100);
    expect(recencyToScore(100, 100, 200)).toBe(0);
  });

  it("scores the midpoint at 50", () => {
    expect(recencyToScore(150, 100, 200)).toBe(50);
  });

  it("returns 100 for a degenerate (single-point) window", () => {
    expect(recencyToScore(100, 100, 100)).toBe(100);
    expect(recencyToScore(100, 200, 100)).toBe(100);
  });

  it("clamps timestamps outside the window", () => {
    expect(recencyToScore(50, 100, 200)).toBe(0);
    expect(recencyToScore(300, 100, 200)).toBe(100);
  });
});

describe("blipFillOpacity", () => {
  it("scales opacity from 0.55 (match 0) to 1.0 (match 100)", () => {
    expect(blipFillOpacity(0)).toBeCloseTo(0.55, 6);
    expect(blipFillOpacity(100)).toBeCloseTo(1.0, 6);
    expect(blipFillOpacity(50)).toBeCloseTo(0.775, 6);
  });

  it("clamps out-of-range matches", () => {
    expect(blipFillOpacity(-10)).toBeCloseTo(0.55, 6);
    expect(blipFillOpacity(150)).toBeCloseTo(1.0, 6);
  });
});

describe("scoreToMatchLevel", () => {
  it("bands scores: HIGH ≥ 80, MED ≥ 50, LOW below", () => {
    expect(scoreToMatchLevel(100)).toBe("HIGH");
    expect(scoreToMatchLevel(80)).toBe("HIGH");
    expect(scoreToMatchLevel(79)).toBe("MED");
    expect(scoreToMatchLevel(50)).toBe("MED");
    expect(scoreToMatchLevel(49)).toBe("LOW");
    expect(scoreToMatchLevel(0)).toBe("LOW");
  });
});

describe("classifyCategory", () => {
  it("routes AI/ML keywords to AI-ML, even with web tags present", () => {
    expect(classifyCategory(["react", "pytorch"], "ML Engineer")).toBe("AI-ML");
    expect(classifyCategory(["llm"], null)).toBe("AI-ML");
  });

  it("routes infra keywords to DevOps", () => {
    expect(classifyCategory(["kubernetes", "terraform"], "Platform Engineer")).toBe("DevOps");
    expect(classifyCategory([], "Site Reliability Engineer")).toBe("DevOps");
  });

  it("routes web UI keywords to Frontend", () => {
    expect(classifyCategory(["react", "tailwind"], "Frontend Engineer")).toBe("Frontend");
  });

  it("routes server keywords to Backend", () => {
    expect(classifyCategory(["go", "postgres"], "Backend Engineer")).toBe("Backend");
  });

  it("routes generalist TS/node to Full-stack", () => {
    expect(classifyCategory(["typescript", "node"], "Product Engineer")).toBe("Full-stack");
  });

  it("falls back to Other when nothing matches", () => {
    expect(classifyCategory(["cobol"], "Mainframe wizard")).toBe("Other");
    expect(classifyCategory([], null)).toBe("Other");
  });

  it("is case-insensitive", () => {
    expect(classifyCategory(["KUBERNETES"], "DEVOPS")).toBe("DevOps");
  });

  it("only ever returns a known category", () => {
    const result = classifyCategory(["typescript", "react", "go", "llm"], "Engineer");
    expect(CATEGORIES).toContain(result);
  });
});
