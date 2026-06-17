import { OnboardingView } from "@/components/profile/onboarding-view";
import { ProfileView } from "@/components/profile/profile-view";
import { toFormState } from "@/components/profile/types";
import { getLatestRunId } from "@/lib/queries/agent-runs";
import { getLatestProfile } from "@/lib/queries/profile";

/**
 * Calibration route. Loads the latest profile version + the most recent agent
 * run (for the audit footer). A missing profile is the genuine first-visit
 * empty state (onboarding); a fetch FAILURE is handled by error.tsx and is a
 * different surface entirely — never blank the saved profile on a read error.
 */
export default async function ProfilePage() {
  const [profile, lastRunId] = await Promise.all([
    getLatestProfile(),
    getLatestRunId(),
  ]);

  if (!profile) {
    return <OnboardingView lastRunId={lastRunId} />;
  }

  return (
    <ProfileView
      initial={toFormState(profile)}
      initialVersion={profile.version}
      lastRunId={lastRunId}
    />
  );
}
