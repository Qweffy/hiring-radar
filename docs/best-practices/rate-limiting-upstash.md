# Rate Limiting Next.js AI Endpoints with Upstash — Best Practices
> Researched 2026-06-10. Sources verified against current official docs.

## TL;DR
- `@upstash/ratelimit@2.0.8` + `@upstash/redis@1.38.x`, one shared `lib/rate-limit.ts`, one `Ratelimit` instance per concern, each with its own `prefix`.
- Request limits: `slidingWindow` per IP for search; `tokenBucket` per IP for the agent endpoint (burst headroom for multi-step tool use).
- Cost limits are a second dimension: `fixedWindow` limiters counting LLM tokens via `limit(key, { rate: tokens })` — per-IP daily cap plus a `global` daily cap bounding total Groq spend.
- Check limits before parsing the body or calling the model; on failure return 429 with `Retry-After: Math.ceil((reset - Date.now()) / 1000)` (`reset` is a Unix ms timestamp).
- Server Actions are public POST endpoints regardless of UI usage — enforce limits inside each action (IP via `headers()`); return a typed `{ ok: false, retryAfterSeconds }`, never rely on HTTP status.
- Hand `pending` to `after()` from `next/server` so analytics writes finish without blocking the response.

## Practices

**Pick the algorithm per endpoint, not globally** ([algorithms doc](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms)).
- `Ratelimit.slidingWindow(20, "1 m")` for `/api/search`: smooth, no fixed-window boundary bursts; the right default single-region choice.
- `Ratelimit.tokenBucket(5, "1 m", 15)` for the agent/chat endpoint: `maxTokens > refillRate` permits a short burst of follow-ups, then throttles to a steady rate. Costlier per check and single-region only — both fine here.
- `Ratelimit.fixedWindow(N, "1 d")` for token budgets: cheapest and an exact counter; boundary bursts are irrelevant for a daily cap.

**One module, explicit prefixes, per-user keys when possible** ([features doc](https://upstash.com/docs/redis/sdks/ratelimit-ts/features)).
```ts
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

export const searchLimiter = new Ratelimit({
  redis, prefix: "rl:search", analytics: true,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
});
export const agentLimiter = new Ratelimit({
  redis, prefix: "rl:agent", analytics: true,
  limiter: Ratelimit.tokenBucket(5, "1 m", 15),
});
export const ipTokenBudget = new Ratelimit({
  redis, prefix: "rl:budget:ip",
  limiter: Ratelimit.fixedWindow(150_000, "1 d"), // LLM tokens / IP / day
});
export const globalTokenBudget = new Ratelimit({
  redis, prefix: "rl:budget:global",
  limiter: Ratelimit.fixedWindow(2_000_000, "1 d"), // total daily interactive spend cap
});

export function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}
```
Key on `user:${id}` once auth exists; `ip:${ip}` is the anonymous fallback. `x-forwarded-for` is trustworthy on Vercel; if self-hosting, only trust it behind a proxy you control.

**Return 429 with `Retry-After` and `X-RateLimit-*`** ([methods doc](https://upstash.com/docs/redis/sdks/ratelimit-ts/methods) — `reset` is Unix ms; official 429 pattern: [Next.js BFF guide](https://nextjs.org/docs/app/guides/backend-for-frontend#rate-limiting)).
```ts
import { after } from "next/server";

const { success, limit, remaining, reset, pending } = await agentLimiter.limit(`ip:${ip}`);
after(pending); // flush analytics without blocking the response
if (!success) {
  return NextResponse.json({ error: "rate_limited" }, {
    status: 429,
    headers: {
      "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(reset),
    },
  });
}
```
Run this before `await request.json()` and before any Groq call.

**Rate limit inside every Server Action** — Next.js: exported actions are "reachable via a direct POST request" even if unused in the UI; verify auth and limits inside each one ([data security guide](https://nextjs.org/docs/app/guides/data-security), [pattern](https://nextjsweekly.com/blog/rate-limiting-server-actions)).
```ts
"use server";
import { headers } from "next/headers";
import { agentLimiter, clientIp } from "@/lib/rate-limit";

export async function askAgent(input: string) {
  const { success, reset } = await agentLimiter.limit(`ip:${clientIp(await headers())}`);
  if (!success) {
    return { ok: false as const, error: "rate_limited" as const,
             retryAfterSeconds: Math.ceil((reset - Date.now()) / 1000) };
  }
  // ... proceed
}
```
Actions cannot emit a real 429 — the result travels inside a 200 RSC payload — so the client branches on the typed result. Apply the same helper in the MCP route handler: it is just another public route.

**Token-spend caps via custom `rate`, settled after the response** ([custom rates](https://upstash.com/docs/redis/sdks/ratelimit-ts/features); same dual request+token model as Upstash's [LangChain integration](https://upstash.com/blog/ratelimit-langchain)).
```ts
const ESTIMATE = 4_000; // pre-charge: prompt + typical completion
const [user, global] = await Promise.all([
  ipTokenBudget.limit(`ip:${ip}`, { rate: ESTIMATE }),
  globalTokenBudget.limit("global", { rate: ESTIMATE }),
]);
if (!user.success || !global.success) return budgetExceeded(user.success ? global : user);

// in onFinish (or after the agent loop), reconcile with actual usage:
const diff = usage.totalTokens - ESTIMATE; // negative rate refunds (>= v2.0.7)
after(Promise.all([
  ipTokenBudget.limit(`ip:${ip}`, { rate: diff }),
  globalTokenBudget.limit("global", { rate: diff }),
]));
```
Pre-charge an estimate so a burst of parallel requests cannot blow past the cap, then refund/charge the difference. Keep Inngest ingestion spend on its own budget key (e.g. `rl:budget:ingest`) so the monthly ingest cannot starve the interactive agent — and vice versa.

**Operational defaults to keep**: `analytics: true` feeds the Upstash console dashboard; the built-in ephemeral cache short-circuits already-blocked identifiers without a Redis trip (`reason: "cacheBlock"`); default `timeout: 5000` ms fails open if Redis is unreachable (`reason: "timeout"`). Every `limit()` is one HTTP call — create the Upstash DB in the region of your Vercel functions.

## Pitfalls
- **Old tutorials put limiting in `middleware.ts` and read `request.ip`.** Next 16 renamed middleware to `proxy.ts` and calls it "a last resort" ([rename notice](https://nextjs.org/docs/messages/middleware-to-proxy)); `request.ip`/`request.geo` were removed from `NextRequest` in Next 15 — read `x-forwarded-for` (or `ipAddress()` from `@vercel/functions` on Vercel). Enforce in route handlers/actions, not proxy.
- **Proxy-only limiting misses Server Actions.** Matching the `next-action` header is brittle, and actions are callable by direct POST anyway — the limiter must live inside the action.
- **Throwing on rate limit inside an action** surfaces as an opaque digest-500 in production. Return a typed result.
- **Fail-open is the default.** On Redis timeout, `success: true` with `reason: "timeout"`. Fine for request limits; for the global budget, decide explicitly (alert on `reason === "timeout"`, or fail closed for that limiter).
- **Streaming overage:** with pre-charge + reconcile, a stream that runs long can overshoot the budget by one request's worth. Accept it; never kill an in-flight stream based on a Redis check.
- **Checking limits after expensive work** (body parsing, embeddings, Groq call) — ordering bug; the check is the first statement of the handler.
- **Two limiters without distinct `prefix`** share Redis keys and corrupt each other's counters.
- **`await pending` inline** adds a round trip of latency; use `after(pending)`.
- **Per-IP keys under CGNAT/private relay** punish whole networks and are weak against IP rotation — they are an abuse brake for anonymous traffic, not a quota system. Move to per-user keys as soon as there is auth.
- **Algorithm limits:** `tokenBucket` is unsupported in `MultiRegionRatelimit`; `slidingWindow` is a weighted approximation, not an exact count.

## Version notes
- `@upstash/ratelimit@2.0.8` is `latest` on npm (verified 2026-06-10); peer dep `@upstash/redis@^1.34.3`, current `1.38.0`. Install: `npm i @upstash/ratelimit @upstash/redis`.
- 2.0.x adds what this doc relies on: negative `rate` values for refunds (v2.0.7), global dynamic limits (v2.0.8); v2 also ships built-in deny-list protection (`enableProtection`, `reason: "denyList"`, `deniedValue`) — optional here.
- SDK is pure HTTP (no TCP Redis client), so it runs on both Node and Edge runtimes — compatible with Next 16's Node-default `proxy.ts` and route handlers, though we deliberately do not limit in proxy.
- Next.js 16.2.x (this repo): `middleware.ts` is deprecated in favour of `proxy.ts` (codemod: `npx @next/codemod@canary middleware-to-proxy .`); `after()` has been stable since 15.1; `request.ip` is long gone (removed in 15.0).
- Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (`Redis.fromEnv()`); never expose them with `NEXT_PUBLIC_`.
````

---

## Sources used (all fetched 2026-06-10)
- https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms
- https://upstash.com/docs/redis/sdks/ratelimit-ts/features
- https://upstash.com/docs/redis/sdks/ratelimit-ts/methods
- https://nextjs.org/docs/app/guides/data-security (Server Actions = public POST endpoints)
- https://nextjs.org/docs/app/guides/backend-for-frontend#rate-limiting (official 429 pattern)
- https://nextjs.org/docs/messages/middleware-to-proxy (Next 16 middleware→proxy rename)
- https://upstash.com/blog/ratelimit-langchain (request + token dual-limit model)
- https://nextjsweekly.com/blog/rate-limiting-server-actions (headers()/x-forwarded-for pattern)
- npm registry: @upstash/ratelimit dist-tags (latest = 2.0.8), @upstash/redis 1.38.0
- https://github.com/upstash/ratelimit-js/releases (v2.0.7 negative rates, v2.0.8 global dynamic limit)
