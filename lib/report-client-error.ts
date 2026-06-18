"use client";

/**
 * Best-effort client → server error report. The browser can't write the DB, so
 * error boundaries POST the crash to `/api/log` (which forwards it to the
 * durable `error_events` log). `keepalive` lets it survive a navigation, and the
 * whole thing is wrapped so reporting never throws inside a boundary.
 */
export function reportClientError(
  error: Error & { digest?: string },
  source: "boundary" | "client" = "boundary",
): void {
  try {
    void fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source,
        message: error.message.length > 0 ? error.message : "Unnamed client error",
        ...(error.digest !== undefined ? { digest: error.digest } : {}),
        ...(error.stack !== undefined ? { stack: error.stack } : {}),
        path: window.location.pathname,
      }),
      keepalive: true,
    });
  } catch {
    // Reporting must never throw inside an error boundary.
  }
}
