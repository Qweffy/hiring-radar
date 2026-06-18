import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifyToken } from "@/lib/auth-token";

/**
 * Admin route gate (Next 16 Proxy — the renamed, Node-runtime successor to
 * middleware). Protects the admin surface: /pipeline today, /settings when it
 * lands in Phase 9. Everything else — the public app (/, /browse, /shortlist,
 * /agent, /profile), API routes, and static assets — is left open.
 *
 * This is an OPTIMISTIC gate: a missing/invalid/expired session cookie rewrites
 * to the login screen. It is not the only line of defense — Server Actions on
 * the admin pages must still verify the session themselves, since actions are
 * reachable by direct POST and a matcher refactor could silently drop coverage
 * (Next 16 data-security guidance). The cookie verification is pure crypto from
 * `lib/auth-token.ts` (no `server-only`, no shared state) so it is safe in the
 * proxy bundle.
 *
 * Fail-closed: `verifyToken` returns false whenever ADMIN_PASSWORD is unset, so
 * an unconfigured deploy locks the admin routes rather than exposing them.
 */

const ADMIN_PREFIXES = ["/pipeline", "/settings", "/diagnostics"] as const;

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (!isAdminPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifyToken(token)) return NextResponse.next();

  // No clearance → render the login screen at the original URL (rewrite keeps
  // the address bar on the admin path so a successful sign-in lands them here).
  // `from` lets the login action redirect back to where they were headed.
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.rewrite(url);
}

export const config = {
  // Statically-analyzable matcher: only the admin prefixes. `:path*` is zero-or-
  // more, but the bare prefix needs its own entry (`/pipeline/:path*` does not
  // match `/pipeline`). Keeps the proxy off static assets, API routes, and the
  // public app entirely.
  matcher: [
    "/pipeline",
    "/pipeline/:path*",
    "/settings",
    "/settings/:path*",
    "/diagnostics",
    "/diagnostics/:path*",
  ],
};
