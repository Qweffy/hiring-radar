// The MCP SDK is pure ESM with explicit `.js` subpath exports; the specifier
// resolves at runtime and via tsc, but import-x's resolver applies the package's
// wildcard `types` template (./dist/esm/*.d.ts) literally and misses TS's
// .js→.d.ts substitution, so it false-positives on no-unresolved. Disable just it.
// eslint-disable-next-line import-x/no-unresolved
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { verifyApiKey, type ApiKeyScope } from "@/lib/mcp/api-keys";
import { createMcpServer } from "@/lib/mcp/server";
import { checkLimit, clientIdentity } from "@/lib/ratelimit";

/**
 * Streamable HTTP transport for the Hiring Radar MCP server — a single `/api/mcp`
 * endpoint that connects from a remote Claude client.
 *
 * Auth: bearer-only (the spec forbids tokens in query strings). Every request
 * must carry `Authorization: Bearer hrk_…`; an unknown/revoked/missing token is
 * 401. The verified key's SCOPE is captured and handed to the server factory, so
 * the write tool (manage_shortlist) refuses a read-only key with a structured
 * Forbidden error rather than a silent allow.
 *
 * Stateless: a fresh McpServer + transport per request (sessionIdGenerator
 * undefined). Sharing one instance across requests leaked data cross-client
 * before SDK 1.26.0 (CVE-2026-25536); per-request construction is the fix and is
 * serverless-friendly (no session store). The same handlers back the stdio
 * transport, so both surfaces are identical.
 *
 * Runs in the Next server context, so it may use server-only modules
 * (lib/ratelimit) directly; the shared MCP code stays server-only-free for stdio.
 */

// JSON-RPC steps can fan out into DB + embedding work; give the route headroom.
export const maxDuration = 60;
// Auth + per-request state must never be cached or statically rendered.
export const dynamic = "force-dynamic";

const WWW_AUTHENTICATE = 'Bearer realm="hiring-radar", error="invalid_token"';

/** RFC 6750 bearer extraction from the Authorization header. */
function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header === null) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? null;
}

function jsonRpcError(
  status: number,
  message: string,
  extraHeaders?: Record<string, string>,
): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  for (const [key, value] of Object.entries(extraHeaders ?? {})) {
    headers.set(key, value);
  }
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32600, message },
      id: null,
    }),
    { status, headers },
  );
}

async function handle(req: Request): Promise<Response> {
  const bearer = bearerToken(req);
  if (bearer === null) {
    return jsonRpcError(401, "Missing bearer token.", {
      "WWW-Authenticate": WWW_AUTHENTICATE,
    });
  }

  // Frequency brake before any DB/verify work. No-ops (allow) when Upstash
  // isn't configured; keys on forwarded IP when present, else "local".
  const limit = await checkLimit("mcp", clientIdentity(req.headers));
  if (!limit.ok) {
    return jsonRpcError(429, "Rate limit exceeded.", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const verified = await verifyApiKey(bearer);
  if (!verified.ok) {
    return jsonRpcError(401, "Invalid or revoked bearer token.", {
      "WWW-Authenticate": WWW_AUTHENTICATE,
    });
  }

  const scope: ApiKeyScope = verified.scope;
  // Fresh server + stateless transport per request (CVE-2026-25536). The write
  // tool consults this captured scope, so a read key can't mutate.
  const server = createMcpServer(() => scope);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // Tear down the per-request instances so nothing leaks across invocations.
    await transport.close();
    await server.close();
  }
}

export { handle as GET, handle as POST, handle as DELETE };
