import Link from "next/link";

import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";

/** 404 — "Off the grid". Back to Radar points at /browse until M2 lands the dashboard. */
export default function NotFound() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center text-center"
      style={{ padding: 40 }}
    >
      <HRIllustration name="off-the-grid" size={132} style={{ marginBottom: 20 }} />
      <p className="hr-label" style={{ margin: "0 0 12px" }}>
        Error 404 · off the grid
      </p>
      <h2
        style={{
          font: "600 28px/1.15 var(--font-display)",
          letterSpacing: "-0.02em",
          color: "var(--text-hi)",
          margin: "0 0 8px",
        }}
      >
        This coordinate doesn&apos;t exist
      </h2>
      <p
        style={{
          font: "var(--text-base)",
          color: "var(--text-mid)",
          maxWidth: 400,
          margin: "0 0 22px",
        }}
      >
        No posting, run, or route maps to here.
      </p>
      <Link
        href="/browse"
        className="inline-flex select-none items-center justify-center whitespace-nowrap no-underline hover:no-underline hover:bg-[color-mix(in_srgb,var(--phosphor)_85%,white)] hover:[box-shadow:0_0_28px_color-mix(in_srgb,var(--phosphor)_38%,transparent)]"
        style={{
          gap: 8,
          height: "var(--control-h)",
          padding: "0 14px",
          font: "600 14px/1 var(--font-ui)",
          color: "var(--bg-void)",
          background: "var(--phosphor)",
          borderRadius: "var(--radius-control)",
          boxShadow: "var(--glow-phosphor)",
          transition: "background var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
        }}
      >
        <Icon name="radar" size={16} />
        Back to Radar
      </Link>
    </div>
  );
}
