"use client";

import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";

interface ProfileErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

/**
 * Load error (state 08) — a FETCH failure, explicitly NOT the onboarding empty
 * state. The copy makes the distinction load-bearing ("your saved calibration
 * is safe — this is a fetch error, not a blank slate") and the recovery is
 * Retry, never paste-CV. The saved profile is never blanked on a read error.
 */
export default function ProfileError({ error, unstable_retry }: ProfileErrorProps) {
  return (
    <div className="absolute inset-0 overflow-auto">
      <div style={{ padding: 28 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 10,
            padding: 40,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
            minHeight: 240,
          }}
        >
          <HRIllustration name="static-interference" size={92} />
          <span style={{ font: "600 15px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
            Couldn&apos;t load your profile
          </span>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            your saved calibration is safe — this is a fetch error, not a blank
            slate
          </span>
          {error.digest ? (
            <span style={{ font: "var(--mono-sm)", color: "var(--text-low)" }}>
              id {error.digest.slice(0, 8)}
            </span>
          ) : null}
          <div style={{ marginTop: 6 }}>
            <Button
              variant="secondary"
              iconLeft="retry"
              onClick={() => unstable_retry()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
