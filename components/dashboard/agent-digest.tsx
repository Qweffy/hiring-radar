import { HRIllustration } from "@/components/ui/hr-illustration";
import { Button } from "@/components/ui/button";

/**
 * Agent Digest — EMPTY variant. The agent ships in M5, so the dashboard always
 * shows "the agent hasn't scanned yet" with a setup CTA and a disabled
 * "Run first scan" (SOON). Once M5 lands, this card flips to the populated
 * run-summary layout (run #, shortlist count, top match, Open/Run again).
 */
export function AgentDigest() {
  return (
    <div
      className="flex flex-1 flex-col"
      style={{
        padding: 18,
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center" style={{ gap: 10, marginBottom: 18 }}>
        <HRIllustration name="agent-orb-idle" size={34} />
        <span
          className="uppercase"
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            color: "var(--violet)",
          }}
        >
          Agent digest
        </span>
      </div>

      <div
        className="flex flex-1 flex-col items-center justify-center text-center"
        style={{ gap: 8 }}
      >
        <HRIllustration name="agent-orb-idle" size={86} />
        <h3 style={{ font: "600 17px/1.25 var(--font-display)", color: "var(--text-hi)" }}>
          The agent hasn&apos;t scanned for you yet
        </h3>
        <p
          className="m-0"
          style={{ font: "var(--text-sm)", color: "var(--text-mid)", maxWidth: 320 }}
        >
          Set up your profile, then run a first scan to get a shortlist.
        </p>
        <div className="flex items-center" style={{ gap: 10, marginTop: 4 }}>
          <Button variant="ghost" iconRight="arrow-right">
            Set up profile
          </Button>
          {/* M5: enable once the agent run pipeline exists. */}
          <Button variant="primary" iconLeft="play" disabled title="Agent runs ship in M5">
            Run first scan
          </Button>
        </div>
      </div>
    </div>
  );
}
