import "server-only";

import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for the AI/LLM surface (agent scans, CV parsing, the live SSE
 * trace). Built to DEGRADE GRACEFULLY: with no Upstash credentials it no-ops
 * (allow everything, warn once) so local dev and CI run unchanged; the instant
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set it activates with
 * real sliding-window limiters — no code change, just env.
 *
 * Per-run token/USD spend is already bounded by DEFAULT_BUDGET (lib/agent/cost.ts):
 * stepBudget 24, maxTokens 600k, maxUsd $1.00, checked before every model call.
 * This module is the request-frequency brake in front of that; it deliberately
 * does NOT duplicate the per-run cost cap.
 *
 * Identity: this is a single-user app with no auth yet, so the natural key is
 * the constant "local". When a request carries a forwarded client IP we prefer
 * that (an abuse brake for anonymous traffic) and fall back to "local". Move to
 * a per-user key the moment auth exists — per-IP punishes whole networks under
 * CGNAT (see docs/best-practices/rate-limiting-upstash.md).
 */

/** Named limiters, one per AI concern. Each gets its own Redis key prefix. */
export type LimiterName = "agentScan" | "cvParse" | "streamConnect";

interface LimiterSpec {
  /** Max requests inside the window, per identity. */
  tokens: number;
  /** Sliding window duration (Upstash `Duration` string, e.g. "1 m"). */
  window: Duration;
  /** Distinct Redis key prefix — shared prefixes corrupt each other's counters. */
  prefix: string;
}

/**
 * Sensible per-identity limits. Agent scans are the most expensive (each fans
 * out into a bounded multi-step Groq loop) so they're the tightest; CV parsing
 * is a single completion; stream connects are cheap DB tails that reconnect on
 * their own, so they get the most headroom.
 */
const SPECS: Record<LimiterName, LimiterSpec> = {
  agentScan: { tokens: 5, window: "1 m", prefix: "rl:agent-scan" },
  cvParse: { tokens: 10, window: "1 m", prefix: "rl:cv-parse" },
  streamConnect: { tokens: 30, window: "1 m", prefix: "rl:stream" },
};

/** The outcome of a limit check. `retryAfterSeconds` is set only when blocked. */
export type LimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

function isConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let warnedUnconfigured = false;

/** Warn exactly once that limiting is off, so logs aren't spammed per request. */
function warnNoopOnce(): void {
  if (warnedUnconfigured) return;
  warnedUnconfigured = true;
  console.warn(
    "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — " +
      "AI rate limiting is DISABLED (allow-all). Set both to activate.",
  );
}

// Lazy singletons: built on first use only when configured, so importing this
// module is free in the no-op path and we never construct a Redis client
// against missing env.
let _redis: Redis | null = null;
const _limiters = new Map<LimiterName, Ratelimit>();

function getRedis(): Redis {
  // Redis.fromEnv() reads UPSTASH_REDIS_REST_URL / _TOKEN; only reached when isConfigured().
  _redis ??= Redis.fromEnv();
  return _redis;
}

function getLimiter(name: LimiterName): Ratelimit {
  const existing = _limiters.get(name);
  if (existing) return existing;

  const spec = SPECS[name];
  const limiter = new Ratelimit({
    redis: getRedis(),
    prefix: spec.prefix,
    analytics: true,
    limiter: Ratelimit.slidingWindow(spec.tokens, spec.window),
  });
  _limiters.set(name, limiter);
  return limiter;
}

/** Seconds until the window resets, never negative, always at least 1. */
function retryAfter(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

/**
 * Check the named limiter for an identity. Allows-and-warns-once when Upstash
 * isn't configured; otherwise consumes one token from the real sliding window.
 * Fails OPEN (allows) if Redis is unreachable — the SDK's default `timeout`
 * returns success with reason "timeout", which is the right call for a
 * frequency brake (never wedge the product on a Redis outage).
 */
export async function checkLimit(
  name: LimiterName,
  identity: string,
): Promise<LimitResult> {
  if (!isConfigured()) {
    warnNoopOnce();
    return { ok: true };
  }

  const { success, reset, pending } = await getLimiter(name).limit(identity);
  // Flush analytics without adding latency; never block the response on it.
  void pending.catch(() => {
    // Analytics write is best-effort — a failure here must not affect the result.
  });

  if (success) return { ok: true };
  return { ok: false, retryAfterSeconds: retryAfter(reset) };
}

/**
 * Stable identity key for a request. Single-user app: defaults to "local".
 * If a forwarded client IP is present (trustworthy behind Vercel's proxy) we
 * key on it instead. `headers` is optional so callers without a request scope
 * (e.g. background paths) still get a usable constant key.
 */
export function clientIdentity(headers?: Headers): string {
  const forwarded = headers?.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? `ip:${ip}` : "local";
}
