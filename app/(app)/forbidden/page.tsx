import { ForbiddenView } from "@/components/auth/forbidden-view";

export const metadata = {
  title: "403 · Restricted airspace",
};

/**
 * Dedicated 403 route for the admin group. Renders inside the app shell (this
 * page lives under the (app) group) so the sidebar/topbar chrome stays put,
 * matching the design's RESTRICTED AIRSPACE state. The proxy gate rewrites
 * unauthenticated visitors to /login; this page covers the
 * authenticated-but-not-cleared case and any explicit forbidden navigation.
 */
export default function ForbiddenPage() {
  return <ForbiddenView />;
}
