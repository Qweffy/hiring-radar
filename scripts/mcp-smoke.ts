import "./env";
// SDK is pure ESM with `.js` subpath exports — resolves at runtime + via tsc;
// import-x false-positives on the wildcard types template (see lib/mcp/server.ts).
// eslint-disable-next-line import-x/no-unresolved
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// eslint-disable-next-line import-x/no-unresolved
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  DIGEST_RESOURCE_URI,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
} from "@/lib/mcp/server";

/**
 * Integration proof for the MCP server, in lieu of a manual MCP Inspector run.
 * Spawns the real stdio server (`tsx scripts/mcp.ts`) as a child process and
 * drives it with the SDK CLIENT over the same JSON-RPC the Claude clients use:
 * initialize → tools/list (assert the 3 tools) → call search_jobs + get_posting
 * against the LIVE DB → assert sane shapes → list resources/prompts → done.
 *
 * Run: `npm run mcp:smoke` (needs DATABASE_URL in .env.local + ingested data).
 * Exits non-zero on the first failed assertion so CI catches a broken server.
 */

const EXPECTED_TOOLS = ["search_jobs", "get_posting", "manage_shortlist"];

function assert(cond: boolean, message: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${message}`);
}

/** Pull the JSON text block out of a CallToolResult and parse it. */
function parseToolText(result: unknown): unknown {
  assert(
    typeof result === "object" && result !== null && "content" in result,
    "tool result has content",
  );
  const content = (result as { content: unknown }).content;
  assert(Array.isArray(content) && content.length > 0, "tool result content is non-empty");
  const first: unknown = content[0];
  assert(
    typeof first === "object" &&
      first !== null &&
      "type" in first &&
      first.type === "text" &&
      "text" in first &&
      typeof first.text === "string",
    "first content block is text",
  );
  return JSON.parse((first as { text: string }).text);
}

/** True when a CallToolResult is flagged isError. */
function isErrorResult(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "isError" in result &&
    (result as { isError?: unknown }).isError === true
  );
}

async function main(): Promise<void> {
  // Only forward defined env vars — StdioServerParameters.env is Record<string,string>.
  const childEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) childEnv[k] = v;
  }

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "scripts/mcp.ts"],
    env: childEnv,
    cwd: process.cwd(),
    stderr: "inherit",
  });

  const client = new Client({ name: "hiring-radar-smoke", version: "0.1.0" });

  console.log("[smoke] spawning stdio server + connecting…");
  await client.connect(transport);

  const serverInfo = client.getServerVersion();
  console.log(
    `[smoke] connected → ${serverInfo?.name ?? "?"} v${serverInfo?.version ?? "?"}`,
  );
  assert(serverInfo?.name === MCP_SERVER_NAME, "server name matches");
  assert(serverInfo.version === MCP_SERVER_VERSION, "server version matches");

  // ── tools/list ──
  const { tools } = await client.listTools();
  const toolNames = tools.map((t) => t.name).sort();
  console.log(`[smoke] tools/list → ${toolNames.join(", ")}`);
  for (const name of EXPECTED_TOOLS) {
    assert(toolNames.includes(name), `tool ${name} is registered`);
  }
  assert(tools.length === EXPECTED_TOOLS.length, "exactly the 3 expected tools");

  // ── resources/list + prompts/list ──
  const { resources } = await client.listResources();
  const { prompts } = await client.listPrompts();
  console.log(
    `[smoke] resources → ${resources.map((r) => r.name).join(", ")} · prompts → ${prompts
      .map((p) => p.name)
      .join(", ")}`,
  );
  assert(resources.length >= 2, "at least 2 resources");
  assert(prompts.length >= 2, "at least 2 prompts");

  // ── tools/call: search_jobs ──
  const searchRaw = await client.callTool({
    name: "search_jobs",
    arguments: { query: "engineer", limit: 5 },
  });
  const search = parseToolText(searchRaw);
  assert(
    typeof search === "object" && search !== null,
    "search_jobs returns an object",
  );
  // Either a NotFound error (empty DB) or a real result with month + results[].
  if ("error" in search) {
    console.log(
      `[smoke] search_jobs → error (likely no data ingested): ${String(
        (search as { error: { message: string } }).error.message,
      )}`,
    );
  } else {
    const r = search as {
      month: string;
      count: number;
      results: { hnId: number; role: string | null; matchScore: number | null }[];
    };
    assert(typeof r.month === "string", "search result has a month");
    assert(typeof r.count === "number", "search result has a count");
    assert(Array.isArray(r.results), "search result has results[]");
    const sample = r.results[0];
    console.log(
      `[smoke] search_jobs → month=${r.month} count=${String(r.count)}` +
        (sample
          ? ` · top: hn-${String(sample.hnId)} "${sample.role ?? "(no role)"}"${
              sample.matchScore === null ? "" : ` match=${String(sample.matchScore)}`
            }`
          : " · (no matches)"),
    );

    // ── tools/call: get_posting on the first hit, if any ──
    if (sample) {
      const postingRaw = await client.callTool({
        name: "get_posting",
        arguments: { hnId: sample.hnId },
      });
      const posting = parseToolText(postingRaw);
      assert(
        typeof posting === "object" && posting !== null && !("error" in posting),
        "get_posting returns a posting (no error)",
      );
      const p = posting as {
        hnId: number;
        rawText: string;
        rawTextTruncated: boolean;
      };
      assert(p.hnId === sample.hnId, "get_posting returns the requested hnId");
      assert(typeof p.rawText === "string", "get_posting includes rawText");
      console.log(
        `[smoke] get_posting hn-${String(p.hnId)} → rawText ${String(
          p.rawText.length,
        )} chars (truncated=${String(p.rawTextTruncated)})`,
      );
    }
  }

  // ── get_posting NotFound path (a bogus id) returns structured error, not throw ──
  const missingRaw = await client.callTool({
    name: "get_posting",
    arguments: { hnId: 999_999_999 },
  });
  const missing = parseToolText(missingRaw);
  assert(
    typeof missing === "object" && missing !== null && "error" in missing,
    "get_posting on a bogus id returns a structured NotFound error",
  );
  assert(isErrorResult(missingRaw), "bogus get_posting result is flagged isError");
  console.log("[smoke] get_posting(bogus) → structured NotFound error (isError=true) OK");

  // ── digest resource reads ──
  const digest = await client.readResource({ uri: DIGEST_RESOURCE_URI });
  const digestEntry = digest.contents[0];
  assert(
    digestEntry !== undefined && "text" in digestEntry && typeof digestEntry.text === "string",
    "digest resource returns text",
  );
  console.log("[smoke] readResource(digest) OK");

  await client.close();
  console.log("\n[smoke] PASS — all assertions held.");
}

main().catch((e: unknown) => {
  console.error("\n[smoke] FAIL:", e);
  process.exit(1);
});
