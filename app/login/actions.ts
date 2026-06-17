"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { clearSession, createSession, verifyPassword } from "@/lib/auth";
import { ActionError, runAction, type ActionResult } from "@/lib/result";
import { parseOrThrow } from "@/lib/validation";

/**
 * Login Server Action for the single shared admin password. Verifies the
 * submitted password against ADMIN_PASSWORD (constant-time compare in
 * `verifyPassword`), and on success mints the signed session cookie. Failures
 * return a deliberately vague "Invalid credentials" ActionError — never reveal
 * whether the password was wrong vs. unconfigured.
 *
 * A lightweight in-process throttle slows password guessing. It is best-effort
 * (per-instance, fail-open) — the real brute-force ceiling is the 12h cookie +
 * a strong shared secret; tighten with the Upstash limiter when this leaves the
 * single-instance deploy.
 */

const MAX_PASSWORD_CHARS = 256;

const loginSchema = z.object({
  password: z.string().min(1, "Enter the admin password.").max(MAX_PASSWORD_CHARS),
});

// In-memory sliding throttle: max attempts per identity per window.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 60_000;
const attempts = new Map<string, number[]>();

function clientIdentity(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? `ip:${ip}` : "local";
}

/** Returns true when the identity is over its attempt budget. Records this attempt. */
function isThrottled(identity: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(identity) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(identity, recent);
  return recent.length > MAX_ATTEMPTS;
}

/**
 * Verify the admin password and open a session. On success the caller should
 * redirect to the original destination (the action returns `ok` and the client
 * navigates — `redirect()` inside the action would be swallowed by runAction's
 * try/catch).
 */
export async function login(input: unknown): Promise<ActionResult<true>> {
  return runAction("Couldn't sign you in — try again.", async () => {
    const { password } = parseOrThrow(loginSchema, input);

    const identity = clientIdentity(await headers());
    if (isThrottled(identity)) {
      throw new ActionError("Too many attempts — wait a minute and try again.");
    }

    if (!verifyPassword(password)) {
      throw new ActionError("Invalid credentials.");
    }

    await createSession();
    return true as const;
  });
}

/** Clear the admin session. The client navigates to a public route afterward. */
export async function signOut(): Promise<ActionResult<true>> {
  return runAction("Couldn't sign you out — try again.", async () => {
    await clearSession();
    return true as const;
  });
}
