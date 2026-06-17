import { connection } from "next/server";
import { getDashboardData } from "@/lib/queries/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requestNowMs } from "@/components/browse/request-now";

/**
 * Radar Dashboard — the root route ("/"). Server component: reads the latest
 * month via the server-only data layer, then hands a typed snapshot to the
 * client view. Streams behind loading.tsx; a crash lands in the segment
 * error boundary without blanking the shell chrome.
 *
 * `connection()` opts the page out of prerendering so the DB read runs per
 * request (live sweep data, not build-time). M4 replaces this with Cache
 * Components: 'use cache' + cacheTag invalidated by ingestion.
 */
export default async function RadarPage() {
  await connection();
  const data = await getDashboardData();
  return <DashboardView data={data} now={requestNowMs()} />;
}
