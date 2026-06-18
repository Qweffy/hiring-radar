"use client";

// global-error replaces the root layout when it crashes, so it must render its
// own <html>/<body> and import global styles itself (Next 16 contract). Fonts
// fall back to the token stacks' system fallbacks — next/font lives in the
// (now unmounted) root layout.
import { useEffect } from "react";

import { reportClientError } from "@/lib/report-client-error";

import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body className="hr-void">
        <title>Lost signal — hiring-radar</title>
        <div
          className="flex min-h-dvh flex-col items-center justify-center text-center"
          style={{ padding: 40 }}
        >
          <p className="hr-label" style={{ margin: "0 0 12px" }}>
            Fatal · signal lost
          </p>
          <h1
            style={{
              font: "600 28px/1.15 var(--font-display)",
              letterSpacing: "-0.02em",
              color: "var(--text-hi)",
              margin: "0 0 8px",
            }}
          >
            Lost signal
          </h1>
          <p
            style={{
              font: "var(--text-base)",
              color: "var(--text-mid)",
              maxWidth: 420,
              margin: "0 0 16px",
            }}
          >
            The radar itself crashed — retry to re-establish contact.
          </p>
          {error.digest !== undefined && (
            <p style={{ font: "var(--mono-sm)", color: "var(--text-low-content)", margin: "0 0 6px" }}>
              id {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap border-none hover:bg-[color-mix(in_srgb,var(--phosphor)_85%,white)] hover:[box-shadow:0_0_28px_color-mix(in_srgb,var(--phosphor)_38%,transparent)]"
            style={{
              gap: 8,
              height: "var(--control-h)",
              padding: "0 14px",
              marginTop: 16,
              font: "600 14px/1 var(--font-ui)",
              color: "var(--bg-void)",
              background: "var(--phosphor)",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--glow-phosphor)",
              transition:
                "background var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
