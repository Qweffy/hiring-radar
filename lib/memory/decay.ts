// Pure memory-decay math — no DB, no server-only, no React. The recall query
// (lib/queries/memory.ts) ranks candidate memories with these functions, and the
// unit suite (tests/unit/memory-decay.test.ts) pins their behavior. Keep this
// module dependency-free so both can import it freely.

/** Half-life of intrinsic salience, in days: strength halves every 30 days idle. */
export const HALF_LIFE_DAYS = 30;
/** Below this effective strength a memory is treated as forgotten (dropped from recall). */
export const STRENGTH_FLOOR = 0.1;
/** Reinforcement weight: how much repeated access lifts strength (log-scaled). */
export const REINFORCE_BETA = 0.15;
/** Cosine similarity at/above which two same-kind memories are deduped/merged. */
export const DEDUP_SIM = 0.92;
/** How many memories prime a fresh agent run. */
export const PRIMING_N = 6;
/** Default number of memories a recall returns. */
export const RECALL_K = 5;
/** ANN candidate pool fetched before TS-side decay ranking. */
export const CANDIDATE_POOL = 40;

/** Exponential-decay rate derived from the half-life: strength *= 2^-(age/HALF_LIFE). */
const LAMBDA = Math.LN2 / HALF_LIFE_DAYS;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Clamp a value into the [0, 1] range. */
export function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Effective strength of a memory right now: its intrinsic salience decayed by
 * how long since it was last accessed, then reinforced by how often it's been
 * accessed. age is clamped at >= 0 so a future lastAccessedAt never amplifies.
 *
 *   strength = salience * exp(-LAMBDA * ageDays) * (1 + REINFORCE_BETA * ln(1 + accessCount))
 */
export function effectiveStrength(
  salience: number,
  lastAccessedAt: Date,
  now: Date,
  accessCount: number,
): number {
  const ageDays = Math.max(
    0,
    (now.getTime() - lastAccessedAt.getTime()) / MS_PER_DAY,
  );
  const decay = Math.exp(-LAMBDA * ageDays);
  const reinforcement = 1 + REINFORCE_BETA * Math.log(1 + Math.max(0, accessCount));
  return salience * decay * reinforcement;
}

/**
 * Blend a query's cosine similarity with a memory's decayed strength into a
 * single recall score. cosineSim is clamped to [0, 1] first so a negative cosine
 * (orthogonal/opposed vectors) can't drag the score below zero or flip its sign.
 */
export function blendScore(cosineSim: number, strength: number): number {
  return clamp01(cosineSim) * strength;
}
