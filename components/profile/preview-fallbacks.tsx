import type { CSSProperties } from "react";
import { HRIllustration } from "@/components/ui/hr-illustration";

const VIOLET_CARD: CSSProperties = {
  background: "var(--violet-12)",
  border: "1px solid rgba(167,139,250,0.32)",
  borderRadius: "var(--radius-card)",
};

const VIOLET_LABEL: CSSProperties = {
  font: "600 11px/1 var(--font-mono)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--violet)",
};

/**
 * Empty preview (first visit) — the AI panel before any CV is parsed. Centered
 * flatline illustration inviting calibration.
 */
export function PreviewEmpty() {
  return (
    <div
      style={{
        ...VIOLET_CARD,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 12,
        padding: "36px 24px",
        minHeight: 230,
      }}
    >
      <HRIllustration name="flatline-calibration" size={120} />
      <span style={{ font: "600 14px/1.4 var(--font-ui)", color: "var(--text-hi)" }}>
        Awaiting calibration signal…
      </span>
      <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
        paste your CV and the preview builds itself
      </span>
    </div>
  );
}

/**
 * Preview degraded (state 06) — the live read is offline. Replaces ONLY the
 * right panel; the form + Save stay fully functional. Static-interference
 * illustration + reassurance that saving still works.
 */
export function PreviewDegraded() {
  return (
    <div
      style={{
        ...VIOLET_CARD,
        padding: 20,
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <span style={{ ...VIOLET_LABEL, marginBottom: 16 }}>How the agent sees you</span>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 10,
        }}
      >
        <HRIllustration name="static-interference" size={80} />
        <span style={{ font: "600 14px/1.4 var(--font-ui)", color: "var(--text-hi)" }}>
          Preview unavailable
        </span>
        <span
          style={{
            font: "var(--mono-sm)",
            color: "var(--text-low-content)",
            maxWidth: 260,
          }}
        >
          Your profile still saves fine — the live read is just offline.
        </span>
      </div>
    </div>
  );
}
