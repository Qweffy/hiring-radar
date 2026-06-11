import type { SignalKind, SignalLine } from "@/lib/queries/dashboard";

export interface SignalFeedProps {
  rows: SignalLine[];
}

interface ToneSpec {
  dot: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

const TONES: Record<SignalKind, ToneSpec> = {
  completed: {
    dot: "var(--phosphor)",
    badgeColor: "var(--phosphor)",
    badgeBg: "var(--phosphor-08)",
    badgeBorder: "var(--border)",
  },
  running: {
    dot: "var(--phosphor)",
    badgeColor: "var(--phosphor)",
    badgeBg: "var(--phosphor-08)",
    badgeBorder: "var(--border)",
  },
  partial: {
    dot: "var(--amber)",
    badgeColor: "var(--amber)",
    badgeBg: "var(--amber-14)",
    badgeBorder: "rgba(255,200,87,0.38)",
  },
  failed: {
    dot: "var(--red)",
    badgeColor: "var(--red)",
    badgeBg: "var(--red-14)",
    badgeBorder: "color-mix(in srgb, var(--red) 42%, transparent)",
  },
};

const DOT_GLOW: Record<SignalKind, string> = {
  completed: "0 0 6px var(--phosphor)",
  running: "0 0 6px var(--phosphor)",
  partial: "0 0 6px var(--amber)",
  failed: "0 0 6px var(--red)",
};

/**
 * Signal Feed — full-width activity log derived from recent sweeps. Each row:
 * mono timestamp, tone dot, text, optional badge. Links to the Pipeline view
 * (ships in M4) via "View all".
 */
export function SignalFeed({ rows }: SignalFeedProps) {
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: "14px 18px", borderBottom: "1px solid var(--divider)" }}
      >
        <span
          className="uppercase"
          style={{
            font: "var(--label-mono)",
            letterSpacing: "var(--label-tracking)",
            color: "var(--text-low)",
          }}
        >
          Signal feed
        </span>
        <span className="flex items-center" style={{ gap: 5 }}>
          <span style={{ font: "600 12px/1 var(--font-ui)", color: "var(--cyan)" }}>View all</span>
          <span style={{ font: "600 12px/1 var(--font-ui)", color: "var(--text-low-content)" }}>
            → Pipeline
          </span>
        </span>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: "20px 18px",
            font: "var(--mono-sm)",
            color: "var(--text-low-content)",
          }}
        >
          No sweeps recorded yet.
        </div>
      ) : (
        rows.map((row) => {
          const tone = TONES[row.kind];
          return (
            <div
              key={row.id}
              className="flex items-center hover:bg-[rgba(147,164,179,0.03)]"
              style={{ gap: 16, padding: "12px 18px", borderBottom: "1px solid var(--divider)" }}
            >
              <span
                className="shrink-0 whitespace-nowrap"
                style={{ width: 74, font: "var(--mono-sm)", color: "var(--text-low)" }}
              >
                {row.time}
              </span>
              <span
                aria-hidden="true"
                className="shrink-0"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: tone.dot,
                  boxShadow: DOT_GLOW[row.kind],
                }}
              />
              <span className="flex-1" style={{ font: "var(--text-sm)", color: "var(--text-mid)" }}>
                {row.text}
              </span>
              {row.badge && (
                <span
                  className="shrink-0 uppercase"
                  style={{
                    height: 20,
                    padding: "0 7px",
                    display: "inline-flex",
                    alignItems: "center",
                    font: "600 10px/1 var(--font-mono)",
                    letterSpacing: "0.1em",
                    color: tone.badgeColor,
                    background: tone.badgeBg,
                    border: `1px solid ${tone.badgeBorder}`,
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {row.badge}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
