"use client";

import { ArrowRight } from "lucide-react";
import { HRIllustration } from "@/components/ui/hr-illustration";

interface ReviewBannerProps {
  variant: "review";
  /** Completed run that produced the picks. */
  runId: number;
  picks: number;
  relativeTime: string;
  onReview: () => void;
}

interface LiveBannerProps {
  variant: "live";
  /** Live run id. */
  runId: number;
  postingsScanned: number;
  step: number;
  totalSteps: number;
}

export type RunBannerProps = ReviewBannerProps | LiveBannerProps;

const SHARED = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  marginBottom: 18,
  background: "var(--violet-12)",
  borderRadius: "var(--radius-control)",
} as const;

/**
 * The agent run / review banner. Two mutually-exclusive variants: `review`
 * (completed run, "added N picks", with a Review-them jump to the New tab) and
 * `live` (in-progress scan with a sweeping progress bar). Both share the violet
 * tint and agent-orb illustration.
 */
export function RunBanner(props: RunBannerProps) {
  if (props.variant === "live") {
    return (
      <div
        style={{
          ...SHARED,
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(167,139,250,0.32)",
          boxShadow: "0 0 20px rgba(167,139,250,0.08)",
        }}
      >
        <span className="hr-orb-pulse" style={{ display: "inline-flex" }}>
          <HRIllustration name="agent-orb-active" size={28} />
        </span>
        <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-hi)" }}>
          Run{" "}
          <span style={{ font: "var(--mono-sm)", color: "var(--violet)" }}>
            #{props.runId}
          </span>{" "}
          scanning…{" "}
          <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>
            {props.postingsScanned} postings · step {props.step}/{props.totalSteps}
          </span>
        </span>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            overflow: "hidden",
            background: "rgba(167,139,250,0.12)",
          }}
        >
          <div
            className="hr-prog"
            style={{
              position: "absolute",
              inset: 0,
              width: "40%",
              background:
                "linear-gradient(90deg, transparent, var(--violet), transparent)",
              animation: "hr-progress 1.1s linear infinite",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...SHARED,
        border: "1px solid rgba(167,139,250,0.32)",
        boxShadow: "0 0 20px rgba(167,139,250,0.08)",
      }}
    >
      <span className="hr-orb" style={{ display: "inline-flex" }}>
        <HRIllustration name="agent-orb-active" size={28} />
      </span>
      <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-hi)" }}>
        Run{" "}
        <span style={{ font: "var(--mono-sm)", color: "var(--violet)" }}>
          #{props.runId}
        </span>{" "}
        added{" "}
        <span style={{ color: "var(--violet)" }}>
          {props.picks} pick{props.picks === 1 ? "" : "s"}
        </span>{" "}
        · {props.relativeTime}
      </span>
      <button
        type="button"
        onClick={props.onReview}
        className="hr-review-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 30,
          padding: "0 12px",
          background: "transparent",
          border: "1px solid rgba(167,139,250,0.42)",
          borderRadius: "var(--radius-control)",
          color: "var(--violet)",
          font: "600 12px/1 var(--font-ui)",
          cursor: "pointer",
        }}
      >
        Review them
        <ArrowRight size={13} strokeWidth={1.5} aria-hidden />
      </button>
      <style href="hr-run-banner" precedence="medium">
        {`.hr-review-btn:hover { background: var(--violet-12); }`}
      </style>
    </div>
  );
}
