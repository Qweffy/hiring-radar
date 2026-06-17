"use client";

import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { Upload } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { PreviewEmpty } from "@/components/profile/preview-fallbacks";
import { ProfileView } from "@/components/profile/profile-view";
import {
  type ProfileFormState,
  type Skill,
} from "@/components/profile/types";
import { parseCv } from "@/app/(app)/profile/actions";

const ACCEPTED = ".md,.txt,.pdf";
const PLACEHOLDER =
  "Paste your CV or résumé text here — the agent extracts your skills automatically. Or upload a .md / .txt / .pdf.";
const FAIL_PLACEHOLDER = "Paste your CV text here…";

/** Empty defaults for a brand-new calibration (no saved profile yet). */
function emptyForm(rawCv: string, skills: Skill[], summary: string | null): ProfileFormState {
  return {
    rawCv,
    summary,
    skills,
    targetRoles: [],
    salary: 150,
    remote: "remote",
    timezone: "UTC-3",
    stages: ["pre-seed", "seed", "series-a"],
    dealbreakers: [],
    agentInstructions: "",
  };
}

interface OnboardingViewProps {
  /** Run that consumed the (not-yet-existent) profile — null on first visit. */
  lastRunId: number | null;
}

/**
 * First-visit onboarding (state 01). A phosphor-glow CV textarea invites the
 * paste; once Groq extracts skills we hand off to the full ProfileView seeded
 * with the parsed result. A parse failure degrades to a manual-paste textarea
 * (state 03) — it never blocks and never reverts to a blank slate.
 */
export function OnboardingView({ lastRunId }: OnboardingViewProps) {
  const [ready, setReady] = useState<ProfileFormState | null>(null);
  const [parseFailed, setParseFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const runParse = useCallback((cv: string) => {
    if (cv.trim().length < 20) return;
    setParseFailed(false);
    startTransition(async () => {
      const res = await parseCv({ cv });
      if (!res.ok) {
        setParseFailed(true);
        return;
      }
      const skills: Skill[] = [
        ...res.data.core.map((name) => ({ name, g: "core" as const })),
        ...res.data.familiar.map((name) => ({ name, g: "familiar" as const })),
        ...res.data.learning.map((name) => ({ name, g: "learning" as const })),
      ];
      setReady(emptyForm(cv, skills, res.data.summary));
    });
  }, []);

  const onFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setParseFailed(true);
        return;
      }
      try {
        const text = await file.text();
        setDraft(text);
        runParse(text);
      } catch {
        setParseFailed(true);
      }
    },
    [runParse],
  );

  if (ready) {
    return (
      <ProfileView initial={ready} initialVersion={1} lastRunId={lastRunId} />
    );
  }

  return (
    <div className="absolute inset-0 overflow-auto">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        onChange={onFile}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)",
          gap: 24,
          padding: 28,
          alignItems: "start",
        }}
      >
        <div style={LEFT_CARD}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                font: "600 11px/1 var(--font-mono)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--phosphor)",
              }}
            >
              Start here — paste your CV
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex cursor-pointer items-center border-none bg-transparent p-0"
              style={{ gap: 6, font: "var(--mono-sm)", color: "var(--cyan)" }}
            >
              <Upload size={13} strokeWidth={1.5} aria-hidden />
              upload .md / .txt / .pdf
            </button>
          </div>

          {parseFailed ? (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                marginBottom: 14,
                background: "var(--amber-14)",
                border: "1px solid rgba(255,200,87,0.3)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <Icon
                name="alert-triangle"
                size={15}
                style={{ color: "var(--amber)", flexShrink: 0 }}
              />
              <span style={{ font: "var(--text-sm)", color: "var(--text-hi)" }}>
                Couldn&apos;t parse the file — paste the text instead.
              </span>
            </div>
          ) : null}

          <textarea
            autoFocus={parseFailed}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => runParse(e.target.value)}
            placeholder={parseFailed ? FAIL_PLACEHOLDER : PLACEHOLDER}
            style={{ ...ONBOARD_TEXTAREA, opacity: isPending ? 0.7 : 1 }}
          />
          {isPending ? (
            <span
              style={{
                display: "block",
                marginTop: 10,
                font: "var(--text-sm)",
                color: "var(--violet)",
              }}
            >
              Extracting skills…
            </span>
          ) : null}
        </div>

        <PreviewEmpty />
      </div>
    </div>
  );
}

const LEFT_CARD: CSSProperties = {
  padding: 22,
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
};

const ONBOARD_TEXTAREA: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  minHeight: 170,
  padding: "14px 16px",
  background: "var(--bg-void)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-control)",
  color: "var(--text-mid)",
  font: "var(--mono-sm)",
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
  boxShadow: "var(--glow-phosphor-sm)",
};
