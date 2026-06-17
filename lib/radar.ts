/**
 * Radar scope math — pure, framework-free, unit-testable. Everything the
 * RadarScope SVG needs to place a blip lives here so spokes, ticks, rim labels
 * and dots stay in sync (one source of truth for the polar geometry).
 *
 * Geometry convention (matches the design prototype):
 *   - Center is (CENTER, CENTER); 0° points straight up (12 o'clock).
 *   - Angle increases clockwise.
 *   - x = cx + r·sin(θ),  y = cy − r·cos(θ)   (θ in radians)
 */

export const SCOPE_SIZE = 560;
export const CENTER = SCOPE_SIZE / 2; // 280
export const OUTER_RADIUS = 236; // outer scope boundary ring

/** Blip salary band → dot tier. */
export type Tier = "small" | "med" | "large";

/** The six radar category clusters. */
export type Category =
  | "Frontend"
  | "Full-stack"
  | "AI-ML"
  | "Backend"
  | "DevOps"
  | "Other";

/** Ordered list of categories (cluster iteration order). */
export const CATEGORIES: readonly Category[] = [
  "Frontend",
  "Full-stack",
  "AI-ML",
  "Backend",
  "DevOps",
  "Other",
] as const;

/**
 * Center angle (degrees, 0° = top, clockwise) of each cluster — taken verbatim
 * from the design spec's rim-label table. `AI-ML` sits at 92° in the spec.
 */
export const CATEGORY_ANGLE: Record<Category, number> = {
  Frontend: 315,
  "Full-stack": 30,
  "AI-ML": 92,
  Backend: 150,
  DevOps: 212,
  Other: 272,
};

/** Display label for a category's rim text (the literal prototype strings). */
export const CATEGORY_LABEL: Record<Category, string> = {
  Frontend: "Frontend",
  "Full-stack": "Full-stack",
  "AI-ML": "AI · ML",
  Backend: "Backend",
  DevOps: "DevOps",
  Other: "Other",
};

/** Angular half-spread of a cluster. DevOps/Other are tighter (18°). */
export function clusterSpread(category: Category): number {
  return category === "DevOps" || category === "Other" ? 18 : 26;
}

/** Convert degrees to radians. */
export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Round to 2 decimals. Math.sin/cos differ by ~1 ULP between the Node and
 * browser V8 builds, which makes SSR coordinates mismatch on hydration; after
 * Math.round(v*100)/100 both engines hold the identical float, so React
 * serializes the SVG/style values byte-for-byte the same. Sub-0.01px precision
 * is invisible on a 560px scope.
 */
const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Polar (radius, angle°) → cartesian {x, y} on the scope, 0° at top, CW. */
export function polarToCartesian(
  radius: number,
  angleDeg: number,
  cx = CENTER,
  cy = CENTER,
): { x: number; y: number } {
  const rad = toRadians(angleDeg);
  return {
    x: round2(cx + radius * Math.sin(rad)),
    y: round2(cy - radius * Math.cos(rad)),
  };
}

/**
 * Match score (0-100) → distance from center. Closer = stronger match.
 * match 100 → r=40 (near center), match 0 → r=200 (near rim).
 *
 * Callers pass the agent's real assessment score when a posting has been
 * scored, falling back to a recency-derived pseudo-score otherwise. See
 * `recencyToScore`.
 */
export function matchToRadius(match: number): number {
  const clamped = Math.max(0, Math.min(100, match));
  return 200 - (clamped / 100) * 160;
}

/**
 * Distribute the i-th blip of an N-sized cluster across its angular spread.
 * blip i sits at center − spread + ((i + 0.5) / N) · 2·spread.
 */
export function blipAngle(
  category: Category,
  index: number,
  clusterSize: number,
): number {
  const center = CATEGORY_ANGLE[category];
  const spread = clusterSpread(category);
  const n = Math.max(1, clusterSize);
  return center - spread + ((index + 0.5) / n) * 2 * spread;
}

/**
 * Salary band → dot tier. Bands mirror the spec's generated-blip salary tiers:
 *   small  ≤ $140k, med ≤ $175k, large otherwise. `null` salary → small.
 * `salary` is the annual figure in whole currency units (coalesce(max, min)).
 */
export function salaryToTier(salary: number | null): Tier {
  if (salary === null) return "small";
  if (salary <= 140_000) return "small";
  if (salary <= 175_000) return "med";
  return "large";
}

/** Tier → dot diameter in px (small 9, med 12, large 15). */
export function tierToDiameter(tier: Tier): number {
  switch (tier) {
    case "small":
      return 9;
    case "med":
      return 12;
    case "large":
      return 15;
  }
}

/**
 * Recency → pseudo-match score (0-100): the newest posting in the window maps
 * to ~100 (near center), the oldest to ~0 (near rim). Linear across the
 * [oldest, newest] span; a single posting → 100. Used as the blip distance
 * only for postings the agent hasn't scored yet — assessed postings use their
 * real match score instead.
 */
export function recencyToScore(
  createdAtMs: number,
  oldestMs: number,
  newestMs: number,
): number {
  const span = newestMs - oldestMs;
  if (span <= 0) return 100;
  const t = (createdAtMs - oldestMs) / span;
  return Math.round(Math.max(0, Math.min(1, t)) * 100);
}

/** Keyword sets per category, matched (case-insensitive) over tags + role. */
const CATEGORY_KEYWORDS: Record<Exclude<Category, "Other">, readonly string[]> = {
  "AI-ML": [
    "ai",
    "ml",
    "machine learning",
    "deep learning",
    "llm",
    "nlp",
    "pytorch",
    "tensorflow",
    "data scien",
    "mlops",
    "genai",
    "generative",
  ],
  DevOps: [
    "devops",
    "kubernetes",
    "k8s",
    "terraform",
    "infra",
    "infrastructure",
    "platform engineer",
    "sre",
    "site reliability",
    "docker",
    "ci/cd",
    "cicd",
    "ansible",
  ],
  Frontend: [
    "frontend",
    "front-end",
    "front end",
    "react",
    "vue",
    "angular",
    "svelte",
    "css",
    "tailwind",
    "ui engineer",
    "web design",
    "next.js",
    "nextjs",
  ],
  Backend: [
    "backend",
    "back-end",
    "back end",
    "go",
    "golang",
    "rust",
    "java",
    "kotlin",
    "scala",
    "django",
    "rails",
    "postgres",
    "api engineer",
    "microservice",
    "c++",
  ],
  "Full-stack": [
    "full-stack",
    "fullstack",
    "full stack",
    "typescript",
    "node",
    "founding engineer",
    "product engineer",
  ],
};

/**
 * Precedence when several clusters match: specialist categories win over the
 * generalist `Full-stack` so e.g. "React + ML" lands in AI-ML, not Full-stack.
 */
const CLASSIFY_ORDER: readonly Exclude<Category, "Other">[] = [
  "AI-ML",
  "DevOps",
  "Frontend",
  "Backend",
  "Full-stack",
];

/**
 * Match a keyword against the haystack. Single-word keywords match on word
 * boundaries (so "ai" never matches "tailwind", "go" never matches "good");
 * multi-word phrases ("machine learning") fall back to a substring test since
 * they're unambiguous.
 */
function keywordMatches(keyword: string, haystack: string): boolean {
  if (keyword.includes(" ") || keyword.includes("/")) {
    return haystack.includes(keyword);
  }
  // Escape regex metacharacters in the keyword (e.g. "c++", "ci/cd", "next.js").
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // eslint-disable-next-line security/detect-non-literal-regexp -- keyword comes from the controlled cluster taxonomy and all regex metacharacters are escaped above, so the pattern stays linear (no ReDoS)
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`).test(haystack);
}

/**
 * Classify a posting into a radar cluster from its stack tags + role text.
 * Pure and deterministic; returns "Other" when nothing matches.
 */
export function classifyCategory(
  stackTags: readonly string[],
  role: string | null,
): Category {
  const haystack = [...stackTags, role ?? ""]
    .join(" ")
    .toLowerCase();

  for (const category of CLASSIFY_ORDER) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((kw) => keywordMatches(kw, haystack))) return category;
  }
  return "Other";
}

/** Opacity-scaled phosphor fill for a blip dot (stronger match → brighter). */
export function blipFillOpacity(match: number): number {
  const clamped = Math.max(0, Math.min(100, match));
  return 0.55 + (clamped / 100) * 0.45;
}

/** Match strength band for the violet MatchBadge: HIGH ≥80, MED ≥50, else LOW. */
export function scoreToMatchLevel(score: number): "HIGH" | "MED" | "LOW" {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MED";
  return "LOW";
}
