import { redirect } from "next/navigation";

import { AgentEmpty } from "@/components/agent-run/agent-empty";
import { getLiveRun, listRuns } from "@/lib/queries/agent-runs";
import { getLatestProfile } from "@/lib/queries/profile";

// The agent index resolves to a concrete run (live, else latest) on each visit,
// or the idle empty state — always dynamic, never cached.
export const dynamic = "force-dynamic";

export default async function AgentIndexPage() {
  const [live, recent] = await Promise.all([getLiveRun(), listRuns(1)]);

  // A run in flight wins — jump straight to its live trace.
  if (live) redirect(`/agent/${live.id}`);
  // Otherwise open the most recent finished run.
  if (recent[0]) redirect(`/agent/${recent[0].id}`);

  // No runs yet — the idle empty state. The CTA depends on whether a profile
  // exists (the scan can't start without one).
  const profile = await getLatestProfile();
  return <AgentEmpty hasProfile={profile !== null} />;
}
