import { notFound } from "next/navigation";

import { AgentRunView } from "@/components/agent-run/agent-run-view";
import { loadRunView } from "@/components/agent-run/loader";
import { requestNowMs } from "@/components/browse/request-now";

// A run's status, trace, cost and picks change every step — never statically
// cache. The live feed streams over SSE; this server render is the snapshot the
// client hydrates from and re-fetches on terminal/action.
export const dynamic = "force-dynamic";

interface AgentRunPageProps {
  params: Promise<{ runId: string }>;
}

export default async function AgentRunPage({ params }: AgentRunPageProps) {
  const { runId: runIdRaw } = await params;
  const runId = Number(runIdRaw);
  if (!Number.isInteger(runId) || runId <= 0) notFound();

  const view = await loadRunView(runId, requestNowMs());
  if (!view) notFound();

  return <AgentRunView {...view} />;
}
