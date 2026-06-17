import { headers } from "next/headers";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SettingsView } from "@/components/settings/settings-view";
import { toKeyView, type KeyView } from "@/components/settings/types";
import { DesktopOnly } from "@/components/shell/desktop-only";
import { verifySession } from "@/lib/auth";
import { getAppSettings } from "@/lib/queries/settings";
import { getApiKeys, getDataObjectCounts } from "@/lib/queries/settings-mcp";

/**
 * Settings — admin-gated (proxy.ts) limits/schedule/access/data screen. Fetches
 * the single settings row, the MCP key list, and the live object counts (for the
 * Purge confirm copy) in parallel, derives the live MCP connection info from the
 * request host, and hands typed props to the client view. No business logic
 * here: the page reads + shapes, the view owns all interactivity.
 *
 * Defense-in-depth: re-verify the session in the route even though the proxy
 * already gates /settings — a matcher refactor must never silently expose it
 * (same posture as the pipeline page).
 */
export const dynamic = "force-dynamic";

/** The monthly sweep cron, mirrored from lib/inngest/functions.ts (display only). */
const SWEEP_CRON = "TZ=UTC 0 */6 1-3 * *";
const SWEEP_FREQUENCY_LABEL = "Monthly · 1st 06:00 UTC";

/** The parsing/matching model, mirrored from lib/llm/extract.ts (display only). */
const AGENT_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

/** Derive the public origin from the forwarded request headers. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * The request timestamp, resolved as data (not read during render) so the
 * "last used / connected" derivation stays a pure render. force-dynamic means
 * this is evaluated fresh per request.
 */
function requestNow(): Promise<number> {
  return Promise.resolve(Date.now());
}

export default async function SettingsPage() {
  if (!(await verifySession())) return <ForbiddenView />;

  const [settings, keys, counts, origin, now] = await Promise.all([
    getAppSettings(),
    getApiKeys(),
    getDataObjectCounts(),
    requestOrigin(),
    requestNow(),
  ]);

  const keyViews: KeyView[] = keys.map((k) => toKeyView(k, now));
  const httpEndpoint = `${origin}/api/mcp`;

  // The two connection recipes shown in the panel. Bearer is shown masked
  // (`hrk_…`) — a real key only ever appears in the one-time reveal.
  const stdioConfig = JSON.stringify(
    {
      mcpServers: {
        "hiring-radar": {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            httpEndpoint,
            "--header",
            "Authorization: Bearer hrk_…",
          ],
        },
      },
    },
    null,
    2,
  );

  return (
    <DesktopOnly>
      <div
        className="absolute"
        style={{ top: 14, right: 18, zIndex: "var(--z-sticky)" }}
      >
        <SignOutButton />
      </div>
      <SettingsView
        initialStepBudget={settings.agentStepBudget}
        initialCostCap={settings.agentMaxUsd}
        initialNotifications={{
          sweep: settings.notifySweep,
          agentRun: settings.notifyAgentRun,
          highMatch: settings.notifyHighMatch,
        }}
        model={AGENT_MODEL}
        sweepCron={SWEEP_CRON}
        sweepFrequencyLabel={SWEEP_FREQUENCY_LABEL}
        keys={keyViews}
        objectCounts={counts}
        httpEndpoint={httpEndpoint}
        stdioConfig={stdioConfig}
      />
    </DesktopOnly>
  );
}
