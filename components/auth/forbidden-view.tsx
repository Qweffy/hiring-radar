"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";

/**
 * 403 RESTRICTED AIRSPACE — shown when a request reaches an admin route without
 * clearance (authenticated-but-wrong case). Mirrors the design handoff
 * (App Shell & Global States, section 10): static-interference illustration,
 * red error label, recovery back to the public Radar.
 */
export function ForbiddenView() {
  const router = useRouter();
  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{ padding: 40 }}
    >
      <div style={{ marginBottom: 18 }}>
        <HRIllustration name="static-interference" size={104} />
      </div>
      <span
        style={{
          font: "var(--label-mono)",
          letterSpacing: "var(--label-tracking)",
          textTransform: "uppercase",
          color: "var(--red)",
          marginBottom: 12,
        }}
      >
        Error 403 · Restricted airspace
      </span>
      <h2
        style={{
          margin: "0 0 8px",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: "-0.02em",
          color: "var(--text-hi)",
        }}
      >
        You don&apos;t have access to this view
      </h2>
      <p
        style={{
          margin: "0 0 22px",
          maxWidth: 420,
          font: "var(--text-base)",
          color: "var(--text-mid)",
        }}
      >
        The pipeline route is limited to admin operators.
      </p>
      <Button variant="primary" iconLeft="radar" onClick={() => router.push("/")}>
        Back to Radar
      </Button>
    </div>
  );
}
