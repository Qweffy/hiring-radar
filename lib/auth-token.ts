/**
 * Pure, dependency-free session-token primitives shared by the server-only
 * session API (`lib/auth.ts`) and the request gate (`proxy.ts`).
 *
 * This module deliberately does NOT import `server-only` or `next/headers`:
 * `proxy.ts` runs in a separate proxy bundle that does not set React's
 * `react-server` export condition, so a `server-only` import there throws at
 * runtime. Keep this file framework-free — only `node:crypto`.
 *
 * Token format: `${payloadB64url}.${hmacB64url}` where the payload is
 * `${issuedAtMs}` and the signature is HMAC-SHA256(payload) keyed on a secret
 * derived from ADMIN_PASSWORD. Stateless: verification needs only the env
 * secret, no server-side store.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "hr_admin";

/** Session lifetime — 12h. After this the cookie is treated as expired. */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

/**
 * The shared admin secret. `null` when ADMIN_PASSWORD is unset — callers MUST
 * fail closed (no password configured ⇒ no valid session can exist, so the
 * admin routes 403). Never log this value.
 */
export function adminSecret(): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  return secret !== undefined && secret.length > 0 ? secret : null;
}

function toBase64Url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** HMAC-SHA256 of `payload` keyed on a key derived from the admin secret. */
function sign(payload: string, secret: string): string {
  // Namespace the key so the cookie HMAC can never collide with another use of
  // the same password elsewhere.
  return toBase64Url(
    createHmac("sha256", `hr_admin_session::${secret}`).update(payload).digest(),
  );
}

/** Mint a signed token stamped with the current time. */
export function signToken(secret: string, issuedAtMs: number = Date.now()): string {
  const payload = toBase64Url(String(issuedAtMs));
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verify a cookie value: constant-time signature check + not-expired.
 * Returns `false` for any malformed, mis-signed, or stale token, and whenever
 * the admin secret is unset (fail closed).
 */
export function verifyToken(token: string | undefined): boolean {
  const secret = adminSecret();
  if (secret === null || token === undefined) return false;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;

  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(payload, secret);

  // Constant-time compare; bail if lengths differ (timingSafeEqual throws then).
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const issuedAtMs = Number.parseInt(Buffer.from(payload, "base64url").toString("utf8"), 10);
  if (!Number.isFinite(issuedAtMs)) return false;

  const ageSeconds = (Date.now() - issuedAtMs) / 1000;
  return ageSeconds >= 0 && ageSeconds < SESSION_MAX_AGE_SECONDS;
}

/**
 * Constant-time password check against ADMIN_PASSWORD. `false` when the env is
 * unset (fail closed) or the candidate doesn't match.
 */
export function verifyPassword(candidate: string): boolean {
  const expected = adminSecret();
  if (expected === null) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
