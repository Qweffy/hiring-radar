"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { reportClientError } from "@/lib/report-client-error";

interface SettingsErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

/**
 * Settings load error — a FETCH failure reading the settings/keys, not a state
 * the user can fix by editing. Saved settings and keys are untouched on the
 * server; recovery is Retry. Mirrors the profile error surface.
 */
export default function SettingsError({ error, unstable_retry }: SettingsErrorProps) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

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
            Couldn&apos;t load settings
          </span>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            your saved limits and keys are safe — this is a fetch error
          </span>
          {error.digest ? (
            <span style={{ font: "var(--mono-sm)", color: "var(--text-low)" }}>
              id {error.digest.slice(0, 8)}
            </span>
          ) : null}
          <div style={{ marginTop: 6 }}>
            <Button variant="secondary" iconLeft="retry" onClick={() => unstable_retry()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
