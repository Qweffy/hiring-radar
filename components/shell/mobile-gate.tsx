"use client";

import Link from "next/link";

import { HRIllustration } from "@/components/ui/hr-illustration";

/** The "needs a bigger screen" gate shown on mobile for the desktop-density
 * admin + agent-trace views (Pipeline, Settings, the run trace). */
export function MobileGate() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{ gap: 16, padding: 32 }}
    >
      <div
        className="hr-gate-spin"
        style={{ width: 120, height: 120, opacity: 0.9 }}
      >
        <HRIllustration name="empty-radar" size={120} />
      </div>

      <span
        className="uppercase"
        style={{
          font: "var(--label-mono)",
          letterSpacing: "var(--label-tracking)",
          color: "var(--text-low)",
        }}
      >
        Desktop only
      </span>

      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 22,
          lineHeight: 1.25,
          letterSpacing: "-0.02em",
          color: "var(--text-hi)",
        }}
      >
        This view needs a bigger screen
      </h2>

      <p
        className="m-0"
        style={{ maxWidth: 280, font: "var(--text-base)", color: "var(--text-mid)" }}
      >
        It&rsquo;s mission control, after all. Open Pipeline, Settings, and the
        agent trace on desktop.
      </p>

      <Link
        href="/"
        className="no-underline hover:no-underline"
        style={{
          marginTop: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 44,
          padding: "0 18px",
          background: "var(--phosphor)",
          borderRadius: "var(--radius-control)",
          color: "#06241A",
          font: "600 14px/1 var(--font-ui)",
          boxShadow: "var(--glow-phosphor-sm)",
        }}
      >
        Back to Radar
      </Link>

      <style href="hr-mobile-gate" precedence="medium">
        {`@keyframes hr-gate-rotate{to{transform:rotate(360deg)}}
.hr-gate-spin{animation:hr-gate-rotate 6s linear infinite}
@media (prefers-reduced-motion:reduce){.hr-gate-spin{animation:none}}`}
      </style>
    </div>
  );
}
