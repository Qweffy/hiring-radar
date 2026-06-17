import { getShortlist } from "@/lib/queries/shortlist";
import { getLiveRun, listRuns } from "@/lib/queries/agent-runs";
import { requestNowMs } from "@/components/browse/request-now";
import {
  ShortlistView,
  type LiveRunData,
  type ReviewBannerData,
} from "@/components/shortlist/shortlist-view";

// The shortlist reflects live pipeline state (agent picks land via background
// runs); never statically cache it. Mutations revalidatePath("/shortlist").
export const dynamic = "force-dynamic";

const STEP_TOTAL = 25;

/** "2h ago" / "5m ago" / "just now" — coarse relative time for the banner. */
function relativeTime(from: Date, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - from.getTime());
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function ShortlistPage() {
  const [items, liveRun, recentRuns] = await Promise.all([
    getShortlist(),
    getLiveRun(),
    listRuns(5),
  ]);

  const nowMs = requestNowMs();

  // Live banner wins when a run is in flight; otherwise surface the most recent
  // completed run that actually produced picks as the review banner.
  let live: LiveRunData | null = null;
  if (liveRun !== null && liveRun.status === "running") {
    live = {
      runId: liveRun.id,
      postingsScanned: liveRun.stepsUsed * 20,
      step: liveRun.stepsUsed,
      totalSteps: Math.max(STEP_TOTAL, liveRun.stepBudget),
    };
  }

  let review: ReviewBannerData | null = null;
  if (live === null) {
    const lastCompleted = recentRuns.find(
      (run) => run.status === "completed" && run.picksCount > 0,
    );
    if (lastCompleted) {
      review = {
        runId: lastCompleted.id,
        picks: lastCompleted.picksCount,
        relativeTime: relativeTime(
          lastCompleted.finishedAt ?? lastCompleted.startedAt,
          nowMs,
        ),
      };
    }
  }

  return <ShortlistView items={items} review={review} live={live} />;
}
