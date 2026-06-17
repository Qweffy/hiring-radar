import "server-only";

import { cookies } from "next/headers";

import {
  adminSecret,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signToken,
  verifyToken,
} from "@/lib/auth-token";

export { SESSION_COOKIE, verifyPassword } from "@/lib/auth-token";

/**
 * Single-password admin auth, server-only. The session is a stateless signed
 * cookie (HMAC over the issue time, keyed on a secret derived from
 * ADMIN_PASSWORD — see `lib/auth-token.ts`). The route gate lives in
 * `proxy.ts`; this module is the cookie read/write surface used by the login
 * and sign-out Server Actions.
 *
 * FAIL-CLOSED: if ADMIN_PASSWORD is unset, no token can ever verify and the
 * login action rejects every attempt, so the admin routes stay locked. This is
 * intentional — an unconfigured deploy must not silently expose the pipeline.
 */

/** Set the signed admin session cookie. Call only from a Server Action / Route Handler. */
export async function createSession(): Promise<void> {
  const key = adminSecret();
  if (key === null) {
    // Defensive: callers gate on verifyPassword first, which already fails
    // closed. Never mint a cookie without a configured secret.
    throw new Error("ADMIN_PASSWORD is not configured");
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, signToken(key), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clear the admin session cookie (sign-out). */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** True when the incoming request carries a valid, unexpired admin session. */
export async function verifySession(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}
