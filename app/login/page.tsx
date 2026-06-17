import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { verifySession } from "@/lib/auth";

// Reflects live session state; never statically cache the gate screen.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in · hiring-radar",
};

/**
 * Admin sign-in screen. Reached either directly (/login) or via the proxy
 * rewrite of a protected route (/pipeline → /login?from=/pipeline). `from` is
 * sanitized to an internal absolute path to prevent open-redirect; anything
 * else falls back to /pipeline.
 */
function safeFrom(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Must be a single internal path: starts with one "/" and not "//" or "/\".
  if (value !== undefined && /^\/(?![/\\])[\w\-/?=&.%]*$/.test(value)) return value;
  return "/pipeline";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const from = safeFrom(params.from);
  const expired = params.expired === "1";

  // Already signed in (e.g. landed on /login directly with a live cookie) — go.
  if (await verifySession()) redirect(from);

  return <LoginForm from={from} expired={expired} />;
}
