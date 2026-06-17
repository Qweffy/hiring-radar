import "./env";
// SDK is pure ESM with `.js` subpath exports — resolves at runtime + via tsc;
// import-x false-positives on the wildcard types template (see lib/mcp/server.ts).
// eslint-disable-next-line import-x/no-unresolved
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createMcpServer, MCP_SERVER_NAME, MCP_SERVER_VERSION } from "@/lib/mcp/server";

/**
 * stdio MCP transport entry — for a LOCAL Claude Desktop / Claude Code config
 * (`npm run mcp`). The client spawns this process and speaks JSON-RPC over
 * stdin/stdout, so NOTHING may write to stdout except the transport: progress
 * goes to stderr (console.error). This process runs OUTSIDE Next, so the whole
 * import graph stays free of `server-only` (see lib/mcp/server.ts).
 *
 * Scope: stdio is the machine owner running with full local DB access, so it's
 * always `read_write` — the read/read_write split exists to gate REMOTE bearer
 * keys over HTTP, not the local owner's own shell.
 */
async function main(): Promise<void> {
  const server = createMcpServer(() => "read_write");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[mcp] ${MCP_SERVER_NAME} v${MCP_SERVER_VERSION} ready on stdio — tools: search_jobs, get_posting, manage_shortlist`,
  );
}

main().catch((e: unknown) => {
  console.error("[mcp] fatal:", e);
  process.exit(1);
});
