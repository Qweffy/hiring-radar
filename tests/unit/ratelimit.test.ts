import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// lib/ratelimit imports "server-only" (a marker that throws outside a server
// bundle) — stub it to a no-op so the module loads under the node test runner.
vi.mock("server-only", () => ({}));

// Capture how the real limiter is constructed and force a deterministic verdict,
// so we never touch a real Redis and can assert the env-based selection + the
// retry-after math directly.
const limitMock = vi.fn();
const slidingWindowMock = vi.fn((tokens: number, window: string) => ({
  tokens,
  window,
}));
const ratelimitCtor = vi.fn();
const fromEnvMock = vi.fn(() => ({ marker: "redis" }));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = slidingWindowMock;
    limit = limitMock;
    constructor(config: unknown) {
      ratelimitCtor(config);
    }
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: fromEnvMock },
}));

const REAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  process.env = { ...REAL_ENV };
});

function configureUpstash(): void {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
}

describe("checkLimit — no-op path (Upstash unconfigured)", () => {
  it("always allows when credentials are absent", async () => {
    const { checkLimit } = await import("@/lib/ratelimit");
    for (let i = 0; i < 50; i++) {
      const res = await checkLimit("agentScan", "local");
      expect(res.ok).toBe(true);
    }
    // Never builds a real limiter / Redis client in the no-op path.
    expect(ratelimitCtor).not.toHaveBeenCalled();
    expect(fromEnvMock).not.toHaveBeenCalled();
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("warns exactly once, not per request", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { checkLimit } = await import("@/lib/ratelimit");
    await checkLimit("agentScan", "local");
    await checkLimit("cvParse", "local");
    await checkLimit("streamConnect", "local");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("factory selection — real limiter when configured", () => {
  it("builds a sliding-window limiter from Redis.fromEnv when env is set", async () => {
    configureUpstash();
    limitMock.mockResolvedValue({
      success: true,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const { checkLimit } = await import("@/lib/ratelimit");
    const res = await checkLimit("agentScan", "local");

    expect(res.ok).toBe(true);
    expect(fromEnvMock).toHaveBeenCalledTimes(1);
    expect(ratelimitCtor).toHaveBeenCalledTimes(1);
    expect(slidingWindowMock).toHaveBeenCalledWith(5, "1 m"); // agentScan spec
    expect(limitMock).toHaveBeenCalledWith("local");

    const config = ratelimitCtor.mock.calls[0]?.[0] as { prefix: string };
    expect(config.prefix).toBe("rl:agent-scan");
  });

  it("reuses one limiter instance per name across calls", async () => {
    configureUpstash();
    limitMock.mockResolvedValue({
      success: true,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const { checkLimit } = await import("@/lib/ratelimit");
    await checkLimit("cvParse", "local");
    await checkLimit("cvParse", "local");
    await checkLimit("cvParse", "local");

    // One construction for the name, one Redis client overall.
    expect(ratelimitCtor).toHaveBeenCalledTimes(1);
    expect(fromEnvMock).toHaveBeenCalledTimes(1);
    expect(limitMock).toHaveBeenCalledTimes(3);
  });

  it("uses each concern's own prefix and window", async () => {
    configureUpstash();
    limitMock.mockResolvedValue({
      success: true,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const { checkLimit } = await import("@/lib/ratelimit");
    await checkLimit("cvParse", "local");
    await checkLimit("streamConnect", "local");

    expect(slidingWindowMock).toHaveBeenCalledWith(10, "1 m"); // cvParse
    expect(slidingWindowMock).toHaveBeenCalledWith(30, "1 m"); // streamConnect
  });
});

describe("retry-after math when blocked", () => {
  it("returns ceil((reset - now) / 1000) seconds", async () => {
    configureUpstash();
    vi.useFakeTimers();
    const now = 1_000_000;
    vi.setSystemTime(now);
    limitMock.mockResolvedValue({
      success: false,
      reset: now + 4200, // 4.2s away → ceil to 5
      pending: Promise.resolve(),
    });

    const { checkLimit } = await import("@/lib/ratelimit");
    const res = await checkLimit("agentScan", "local");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.retryAfterSeconds).toBe(5);
    vi.useRealTimers();
  });

  it("never returns less than 1 second, even if the window already reset", async () => {
    configureUpstash();
    vi.useFakeTimers();
    const now = 2_000_000;
    vi.setSystemTime(now);
    limitMock.mockResolvedValue({
      success: false,
      reset: now - 5000, // already in the past
      pending: Promise.resolve(),
    });

    const { checkLimit } = await import("@/lib/ratelimit");
    const res = await checkLimit("agentScan", "local");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.retryAfterSeconds).toBe(1);
    vi.useRealTimers();
  });
});

describe("clientIdentity", () => {
  it("defaults to 'local' with no headers", async () => {
    const { clientIdentity } = await import("@/lib/ratelimit");
    expect(clientIdentity()).toBe("local");
  });

  it("defaults to 'local' when x-forwarded-for is absent", async () => {
    const { clientIdentity } = await import("@/lib/ratelimit");
    expect(clientIdentity(new Headers())).toBe("local");
  });

  it("keys on the first forwarded IP when present", async () => {
    const { clientIdentity } = await import("@/lib/ratelimit");
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIdentity(h)).toBe("ip:203.0.113.7");
  });

  it("trims whitespace around the forwarded IP", async () => {
    const { clientIdentity } = await import("@/lib/ratelimit");
    const h = new Headers({ "x-forwarded-for": "  198.51.100.2  " });
    expect(clientIdentity(h)).toBe("ip:198.51.100.2");
  });
});
