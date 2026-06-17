"use client";

import { ArrowRight } from "lucide-react";
import { Fragment, useTransition  } from "react";
import  { type CSSProperties } from "react";

import { requestSweep } from "@/app/(app)/pipeline/actions";
import { Button } from "@/components/ui/button";


const mono: CSSProperties = {
  font: "var(--mono-sm)",
  color: "var(--text-hi)",
  padding: "1px 5px",
  background: "var(--bg-void)",
  borderRadius: "var(--radius-sm)",
};

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: "var(--radius-control)",
  font: "var(--mono-sm)",
};

export interface FailedBannerProps {
  /** Stage that failed, e.g. "embed". */
  failedStep: string;
  /** Short cause, e.g. "provider 500". */
  errorCause: string;
  /** Month whose data is still being served, e.g. "May". */
  lastGoodMonth: string;
  /** Steps that passed before the failure. */
  passedSteps: string[];
  /** Thread + month to resume on retry. */
  threadId: number | null;
  month: string | null;
}

/** State 3 — latest run failed: red banner + resume action + failure pipeline. */
export function FailedBanner({
  failedStep,
  errorCause,
  lastGoodMonth,
  passedSteps,
  threadId,
  month,
}: FailedBannerProps) {
  const [pending, startTransition] = useTransition();

  const retry = () => {
    if (threadId === null || month === null) return;
    startTransition(async () => {
      await requestSweep({ threadId, month, trigger: "manual" });
    });
  };

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div
        className="flex items-center"
        style={{
          gap: 12,
          padding: "13px 16px",
          background: "var(--red-14)",
          border: "1px solid color-mix(in srgb, var(--red) 32%, transparent)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--red)",
            boxShadow: "0 0 10px var(--red)",
            flexShrink: 0,
          }}
        />
        <span className="flex-1" style={{ font: "var(--text-sm)", color: "var(--text-hi)" }}>
          Latest sweep failed at <span style={mono}>{failedStep}</span> step — Browse is
          serving <span style={mono}>{lastGoodMonth}</span> data.
        </span>
        <Button
          variant="primary"
          iconLeft="play"
          loading={pending}
          disabled={threadId === null || month === null}
          onClick={retry}
        >
          Retry from failed step
        </Button>
      </div>

      <div
        className="flex flex-1 flex-wrap items-center"
        style={{
          gap: 6,
          padding: 16,
          background: "var(--bg-void)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
        }}
      >
        {passedSteps.map((name) => (
          <Fragment key={name}>
            <span
              style={{
                ...chipBase,
                background: "var(--phosphor-08)",
                border: "1px solid var(--border-strong)",
                color: "var(--phosphor)",
              }}
            >
              {name} ✓
            </span>
            <ArrowRight
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
              style={{ color: "var(--text-low)", flexShrink: 0 }}
            />
          </Fragment>
        ))}
        <span
          style={{
            ...chipBase,
            background: "var(--red-14)",
            border: "1px solid color-mix(in srgb, var(--red) 45%, transparent)",
            color: "var(--red)",
          }}
        >
          {failedStep} ✗ {errorCause}
        </span>
      </div>
    </div>
  );
}
