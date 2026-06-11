# MCP Server Implementation in TypeScript — Best Practices
> Researched 2026-06-10. Sources verified against current official docs.

## TL;DR
- Build on `@modelcontextprotocol/sdk` **v1.x**, pinned `>=1.26.0` (latest: **1.29.0**). SDK v2 (`@modelcontextprotocol/server`) is pre-alpha on `main` — do not use until its stable release (~Q3 2026).
- Expose the server over **Streamable HTTP** from a Next.js route handler via `mcp-handler@1.1.0` at `app/api/[transport]/route.ts`. No separate service needed for stateless tools.
- Run **stateless**: fresh `McpServer` + transport per request (mcp-handler does this). Sharing one instance across requests leaked data cross-client before 1.26.0 (CVE-2026-25536).
- Use `registerTool` / `registerResource` / `registerPrompt` with **zod v3** schemas. `server.tool()` is legacy; HTTP+SSE transport is deprecated.
- Gate the endpoint with `withMcpAuth` (bearer verification) + a `/.well-known/oauth-protected-resource` route. Full OAuth 2.1 only if third parties connect.
- Test with `npx @modelcontextprotocol/inspector`; connect with `claude mcp add --transport http`.

## Practices
- **Pin SDK v1.x and zod v3.** `npm install mcp-handler @modelcontextprotocol/sdk@^1.29.0 zod@^3`. v1.x is "the recommended version for production use"; v2 changes package names and moves to Standard Schema. Source: https://github.com/modelcontextprotocol/typescript-sdk
- **Use the `register*` APIs.** `server.registerTool(name, { title, description, inputSchema: { q: z.string() } }, handler)`; same shape for `registerResource` (with `ResourceTemplate` for parameterised URIs) and `registerPrompt`. Add `outputSchema` + return `structuredContent` for machine-readable results — useful for hiring-radar search tools. Source: https://ts.sdk.modelcontextprotocol.io/
- **Choose Streamable HTTP, not stdio, for this repo.** Stdio (`StdioServerTransport`) is for locally spawned processes only; Streamable HTTP is a single `/mcp` endpoint handling JSON-RPC over POST with optional SSE upgrade, and is the recommended remote transport. Source: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- **Stateless by default.** Sessions exist via the `Mcp-Session-Id` header (`sessionIdGenerator` in `StreamableHTTPServerTransport`), but tools-only servers don't need them; pass `sessionIdGenerator: undefined` (raw SDK) or just use mcp-handler defaults. Stateless = serverless-friendly, no Redis, no sticky routing. Source: https://github.com/modelcontextprotocol/typescript-sdk
- **Deploy as a Next.js route handler.** `app/api/[transport]/route.ts`:
  ```ts
  const handler = createMcpHandler((server) => { server.registerTool(/* … */); },
    {}, { basePath: "/api", maxDuration: 60 });
  export { handler as GET, handler as POST };
  ```
  Keeps one deploy unit, shares Drizzle/pgvector code with the app. Choose a **separate service** (Express + `StreamableHTTPServerTransport`) only if you need stateful sessions, server-initiated notifications, or executions beyond your platform's function timeout. Sources: https://github.com/vercel/mcp-handler, https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
- **Auth: bearer first, OAuth if public.** Wrap the handler: `withMcpAuth(handler, verifyToken, { required: true })` where `verifyToken(req, bearerToken)` returns `AuthInfo | undefined` (available as `extra.authInfo` in tool handlers). Add `app/.well-known/oauth-protected-resource/route.ts` exporting `protectedResourceHandler({ authServerUrls })` as GET and `metadataCorsOptionsRequestHandler()` as OPTIONS — clients discover auth via 401 + RFC 9728 metadata. The spec mandates OAuth 2.1 with PKCE, RFC 8414 AS metadata, and RFC 8707 resource indicators for remote servers; a static bearer token validated server-side is fine for a personal single-user server. Sources: https://github.com/vercel/mcp-handler/blob/main/docs/AUTHORIZATION.md, https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- **Rate-limit and sanitise like the rest of the AI surface.** The MCP endpoint is an AI endpoint: apply the existing Upstash limiter inside `verifyToken` or the tool handlers, and treat HN posting text returned by tools as untrusted data (no instructions in tool output), consistent with the repo's prompt-injection defences.
- **Test with MCP Inspector.** UI: `npx @modelcontextprotocol/inspector`, connect with transport "Streamable HTTP" + `http://localhost:3000/api/mcp` (bearer token field sends `Authorization`). CI/scripting: `npx @modelcontextprotocol/inspector --cli http://localhost:3000/api/mcp --method tools/list` and `--method tools/call --tool-name search_postings --tool-arg q=rust`. Source: https://modelcontextprotocol.io/docs/tools/inspector
- **Connect from Claude Code.** `claude mcp add --transport http hiring-radar https://<host>/api/mcp --header "Authorization: Bearer $TOKEN"`; add `--scope project` to commit it as `.mcp.json` (flags go before the name). Source: https://code.claude.com/docs/en/mcp
- **Connect from Claude Desktop.** Remote: Settings → Connectors → "Add custom connector" with the HTTPS URL (runs OAuth; connects from Anthropic's cloud, so localhost won't work). Local dev or token-auth servers: bridge via `claude_desktop_config.json` with `npx mcp-remote http://localhost:3000/api/mcp --header "Authorization: Bearer ..."`. Sources: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp, https://modelcontextprotocol.io/docs/develop/connect-remote-servers

## Pitfalls
- **HTTP+SSE transport (`SSEServerTransport`, `/sse` + `/messages` endpoints)** — deprecated since spec 2025-03-26, still everywhere in tutorials. Implement Streamable HTTP only; skip mcp-handler's Redis-backed SSE fallback (`REDIS_URL` is only for that legacy path).
- **Reusing one `McpServer`/transport across requests in stateless HTTP deployments** — cross-client data leak in SDK 1.10.0–1.25.3 (CVE-2026-25536, fixed 1.26.0: https://advisories.gitlab.com/npm/@modelcontextprotocol/sdk/CVE-2026-25536/). Also ReDoS in `UriTemplate` before 1.25.2 (CVE-2026-0621). Pin `>=1.26.0` and create instances per request.
- **`server.tool()` / `server.resource()`** — old API from 2024 tutorials; works but `registerTool`/`registerResource`/`registerPrompt` is current v1.x style.
- **Confusing `next-devtools-mcp`** (Next.js 16's built-in dev-server MCP at `/_next/mcp` for coding agents — https://nextjs.org/docs/app/guides/mcp) with shipping your own MCP server. Unrelated features.
- **Remote URLs in `claude_desktop_config.json`** — Claude Desktop spawns stdio servers only from that file; remote servers go through custom connectors or an `mcp-remote` stdio bridge.
- **Bearer tokens in query strings** — explicitly forbidden by the auth spec; header only.
- **Inspector auth friction** — since 0.14 the proxy requires a session token printed at startup; never set `DANGEROUSLY_OMIT_AUTH=true` (the README calls it "incredibly dangerous").
- **Zod v4 with SDK v1** — v1.x + mcp-handler expect `zod@^3`; Standard Schema (Zod v4/Valibot/ArkType) lands with SDK v2.
- **DNS rebinding** — if you ever run a raw `StreamableHTTPServerTransport` bound to localhost, set `enableDnsRebindingProtection: true` + `allowedHosts: ['127.0.0.1']`. mcp-handler on a deployed HTTPS host doesn't need it.

## Version notes
- **Spec:** current stable revision **2025-11-25**; next revision **2026-07-28** (RC locked 2026-05-21 — https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/). Nothing in this doc changes under the RC; revisit after it ships.
- **`@modelcontextprotocol/sdk` 1.29.0** — v1.x line, production-recommended; security floor **1.26.0**. v1 gets fixes for 6+ months after v2 ships.
- **SDK v2 (pre-alpha):** splits into `@modelcontextprotocol/server` / `client` plus `node`/`express`/`hono` adapters, Standard Schema validation; stable targeted Q3 2026. Plan a migration, build on v1.x today.
- **`mcp-handler` 1.1.0** (Vercel) — Next.js route-handler adapter; requires SDK `>=1.26.0`, `zod@^3`.
- **`@modelcontextprotocol/inspector` 0.22.0**; **`mcp-remote` 0.1.38** (stdio→HTTP bridge for Claude Desktop).
- Install: `npm install mcp-handler @modelcontextprotocol/sdk@^1.29.0 zod@^3`.
