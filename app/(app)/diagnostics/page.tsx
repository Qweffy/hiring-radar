import { ForbiddenView } from "@/components/auth/forbidden-view";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requestNowMs } from "@/components/browse/request-now";
import { DiagnosticsView } from "@/components/diagnostics/diagnostics-view";
import { DesktopOnly } from "@/components/shell/desktop-only";
import { verifySession } from "@/lib/auth";
import { getErrorSummary, getRecentErrors } from "@/lib/queries/errors";

// The error log changes on every captured event — never statically cache.
export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  // Defense-in-depth: the proxy gate already rewrites unauthenticated requests
  // to /login, but verify in the route too (Next 16 data-security guidance).
  if (!(await verifySession())) return <ForbiddenView />;

  const [events, summary] = await Promise.all([
    getRecentErrors(),
    getErrorSummary(),
  ]);

  return (
    <DesktopOnly>
      <div
        className="absolute"
        style={{ top: 14, right: 18, zIndex: "var(--z-sticky)" }}
      >
        <SignOutButton />
      </div>
      <DiagnosticsView events={events} summary={summary} now={requestNowMs()} />
    </DesktopOnly>
  );
}
