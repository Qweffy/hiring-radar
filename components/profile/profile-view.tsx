"use client";

import { Upload } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type CSSProperties,
} from "react";

import { parseCv, saveProfile } from "@/app/(app)/profile/actions";
import { DirtyBar } from "@/components/profile/dirty-bar";
import { PreviewDegraded } from "@/components/profile/preview-fallbacks";
import { PreviewPanel } from "@/components/profile/preview-panel";
import { SectionHeader } from "@/components/profile/section-header";
import { SkillGroups } from "@/components/profile/skill-groups";
import {
  REMOTE_OPTIONS,
  SKILL_ORDER,
  STAGE_OPTIONS,
  skillsToBuckets,
  remoteToDb,
  type ProfileFormState,
  type RemoteValue,
} from "@/components/profile/types";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Icon } from "@/components/ui/icon";
import { RangeSlider } from "@/components/ui/range-slider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tag } from "@/components/ui/tag";
import { Toast } from "@/components/ui/toast";

const ACCEPTED = ".md,.txt,.pdf";
const PARSE_PLACEHOLDER =
  "Paste your CV or résumé text here — the agent extracts your skills automatically. Or upload a .md / .txt / .pdf.";

type SaveToast = { tone: "success" | "error"; message: string } | null;

interface ProfileViewProps {
  initial: ProfileFormState;
  initialVersion: number;
  lastRunId: number | null;
  /** Render the AI panel as degraded (live read offline) — Save still works. */
  previewDegraded?: boolean;
}

/** Default narrative when the saved summary is empty — derived, not LLM. */
function fallbackNarrative(form: ProfileFormState): string {
  const core = form.skills
    .filter((s) => s.g === "core")
    .map((s) => s.name)
    .slice(0, 3)
    .join("/");
  const stack = core.length > 0 ? `${core} core` : "a broad stack";
  return `Senior product engineer, ${stack}, shipping AI-assisted features end-to-end. ${
    form.remote === "remote" ? "Remote-only" : "Open to hybrid/onsite"
  } from ${form.timezone}. Targets $${form.salary}k+ senior IC roles with real LLM surface area.`;
}

/**
 * Calibration — the interactive profile screen. Owns the form model, dirty
 * tracking, the parse/save flows and the live preview's ping sweep. Enforces the
 * product invariants: a save error keeps edits + the dirty bar live; a preview
 * failure degrades only the right panel; route-leave while dirty confirms first.
 */
export function ProfileView({
  initial,
  initialVersion,
  lastRunId,
  previewDegraded = false,
}: ProfileViewProps) {
  const [form, setForm] = useState<ProfileFormState>(initial);
  const [version, setVersion] = useState(initialVersion);
  const [runId, setRunId] = useState<number | null>(lastRunId);
  const [savedNarrative, setSavedNarrative] = useState<string | null>(initial.summary);

  const [shimmer, setShimmer] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [saveToast, setSaveToast] = useState<SaveToast>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const sweepTimer = useRef<number | null>(null);

  // Dirty when the live form diverges from the last-saved snapshot. Snapshot is
  // state (not a ref) so the dirty comparison is a pure render-time derivation.
  const [baseline, setBaseline] = useState<ProfileFormState>(initial);
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline],
  );

  // ---- preview ping sweep (420ms violet recalc cue) ---------------------
  const ping = useCallback(() => {
    setShimmer(false);
    requestAnimationFrame(() => {
      setShimmer(true);
      if (sweepTimer.current !== null) window.clearTimeout(sweepTimer.current);
      sweepTimer.current = window.setTimeout(() => setShimmer(false), 420);
    });
  }, []);

  useEffect(
    () => () => {
      if (sweepTimer.current !== null) window.clearTimeout(sweepTimer.current);
    },
    [],
  );

  // ---- edit handlers (every meaningful edit fires the ping) --------------
  const patch = useCallback(
    (next: Partial<ProfileFormState>) => {
      setForm((f) => ({ ...f, ...next }));
      ping();
    },
    [ping],
  );

  const cycleSkill = useCallback(
    (name: string) => {
      setForm((f) => ({
        ...f,
        skills: f.skills.map((s) =>
          s.name === name
            ? {
                ...s,
                g:
                  SKILL_ORDER[
                    (SKILL_ORDER.indexOf(s.g) + 1) % SKILL_ORDER.length
                  ] ?? s.g,
              }
            : s,
        ),
      }));
      ping();
    },
    [ping],
  );

  const onSalary = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      patch({ salary: Number.parseInt(e.target.value, 10) });
    },
    [patch],
  );

  const onRemote = useCallback(
    (v: string) => {
      patch({ remote: v as RemoteValue });
    },
    [patch],
  );

  const toggleStage = useCallback(
    (id: string) => {
      setForm((f) => ({
        ...f,
        stages: f.stages.includes(id)
          ? f.stages.filter((s) => s !== id)
          : [...f.stages, id],
      }));
      ping();
    },
    [ping],
  );

  const removeRole = useCallback(
    (role: string) => {
      setForm((f) => ({ ...f, targetRoles: f.targetRoles.filter((r) => r !== role) }));
      ping();
    },
    [ping],
  );

  const removeDealbreaker = useCallback(
    (db: string) => {
      setForm((f) => ({ ...f, dealbreakers: f.dealbreakers.filter((d) => d !== db) }));
      ping();
    },
    [ping],
  );

  const addRole = useCallback(() => {
    const value = window.prompt("Add a desired role")?.trim();
    if (!value) return;
    setForm((f) =>
      f.targetRoles.includes(value)
        ? f
        : { ...f, targetRoles: [...f.targetRoles, value] },
    );
    ping();
  }, [ping]);

  const addDealbreaker = useCallback(() => {
    const value = window.prompt("Add a dealbreaker")?.trim();
    if (!value) return;
    setForm((f) =>
      f.dealbreakers.includes(value)
        ? f
        : { ...f, dealbreakers: [...f.dealbreakers, value] },
    );
    ping();
  }, [ping]);

  // ---- CV parse ----------------------------------------------------------
  const runParse = useCallback(
    (cv: string) => {
      if (cv.trim().length < 20) return; // too sparse to bother
      setParseFailed(false);
      setParsing(true);
      startTransition(async () => {
        const res = await parseCv({ cv });
        setParsing(false);
        if (!res.ok) {
          setParseFailed(true);
          return;
        }
        const next = [
          ...res.data.core.map((name) => ({ name, g: "core" as const })),
          ...res.data.familiar.map((name) => ({ name, g: "familiar" as const })),
          ...res.data.learning.map((name) => ({ name, g: "learning" as const })),
        ];
        setForm((f) => ({
          ...f,
          rawCv: cv,
          skills: next,
          summary: res.data.summary ?? f.summary,
        }));
        ping();
      });
    },
    [ping],
  );

  const onCvBlur = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const cv = e.target.value;
      if (cv !== baseline.rawCv) runParse(cv);
    },
    [runParse, baseline.rawCv],
  );

  const onUploadClick = useCallback(() => fileRef.current?.click(), []);

  const onFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      // PDFs aren't text-extractable client-side — degrade to manual paste.
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setParseFailed(true);
        return;
      }
      try {
        const text = await file.text();
        setForm((f) => ({ ...f, rawCv: text }));
        runParse(text);
      } catch {
        setParseFailed(true);
      }
    },
    [runParse],
  );

  // ---- save --------------------------------------------------------------
  const doSave = useCallback(() => {
    setSaveToast(null);
    startTransition(async () => {
      const res = await saveProfile({
        rawCv: form.rawCv.trim() === "" ? null : form.rawCv,
        summary: form.summary,
        skills: skillsToBuckets(form.skills),
        targetRoles: form.targetRoles,
        salaryFloor: form.salary * 1000,
        remotePref: remoteToDb(form.remote),
        timezone: form.timezone.trim() === "" ? null : form.timezone,
        companyStages: form.stages,
        dealbreakers: form.dealbreakers,
        agentInstructions:
          form.agentInstructions.trim() === "" ? null : form.agentInstructions,
      });
      if (!res.ok) {
        // Save error: edits preserved, dirty bar stays live, offer Retry.
        setSaveToast({ tone: "error", message: res.error });
        return;
      }
      setBaseline(form); // new saved snapshot — clears the dirty flag
      setVersion(res.data.version);
      if (res.data.runId != null) setRunId(res.data.runId);
      setSavedNarrative(form.summary);
      setSaveToast({
        tone: "success",
        message:
          res.data.runId != null
            ? `Saved as V${res.data.version} — agent run #${res.data.runId} started.`
            : res.data.rerunNote ?? `Saved as V${res.data.version}.`,
      });
      ping();
    });
  }, [form, ping]);

  const discard = useCallback(() => {
    setForm(baseline);
    setParseFailed(false);
    setConfirmOpen(false);
    ping();
  }, [ping, baseline]);

  // ---- discard-on-leave guard (in-app + browser unload) ------------------
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // reason: returnValue is deprecated but still required by some browsers
      // (older Chrome/Safari) to actually show the unload prompt; preventDefault
      // alone is not honoured everywhere. Kept as a deliberate legacy fallback.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const narrative = savedNarrative ?? fallbackNarrative(form);

  return (
    <div className="absolute inset-0 overflow-auto">
      <style href="hr-profile-anim" precedence="medium">
        {`@keyframes hr-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes hr-sweep400{0%{background-position:150% 0;opacity:1}100%{background-position:-150% 0;opacity:0}}
@media (prefers-reduced-motion:reduce){
  [data-sweep],[data-shimmer]{animation:none!important}
}`}
      </style>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        // onFile is async (reads file text); the change handler wants a void
        // return, so fire-and-forget — onFile owns its own error handling.
        onChange={(e) => void onFile(e)}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)",
          gap: 28,
          padding: 28,
          alignItems: "start",
        }}
      >
        {/* ===== LEFT — CALIBRATION FORM ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* 01 SIGNAL SOURCE */}
          <section>
            <SectionHeader label="01 · Signal source" color="var(--phosphor)" />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <label
                htmlFor="cv-input"
                style={{ font: "var(--text-sm)", color: "var(--text-mid)" }}
              >
                Paste your CV
              </label>
              <button
                type="button"
                onClick={onUploadClick}
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
              id="cv-input"
              defaultValue={form.rawCv}
              onBlur={onCvBlur}
              placeholder={PARSE_PLACEHOLDER}
              style={CV_TEXTAREA}
            />

            {parsing ? (
              <ParsingIndicator />
            ) : form.skills.length > 0 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    margin: "18px 0 12px",
                  }}
                >
                  <Icon name="check" size={14} style={{ color: "var(--phosphor)" }} />
                  <span style={{ font: "var(--text-sm)", color: "var(--text-hi)" }}>
                    Parsed {form.skills.length} skills
                  </span>
                  <span
                    style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
                  >
                    · click a tag to recategorize
                  </span>
                </div>
                <SkillGroups skills={form.skills} onCycle={cycleSkill} />
              </>
            ) : null}
          </section>

          {/* 02 TARGETS */}
          <section>
            <SectionHeader
              label="02 · Targets"
              color="var(--phosphor)"
              marginBottom={16}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Desired roles */}
              <div>
                <label style={BLOCK_LABEL}>Desired roles</label>
                <div style={CHIP_ROW}>
                  {form.targetRoles.map((role) => (
                    <Tag
                      key={role}
                      tone="phosphor"
                      selected
                      onRemove={() => removeRole(role)}
                    >
                      {role}
                    </Tag>
                  ))}
                  <AddChip label="+ add role" onClick={addRole} />
                </div>
              </div>

              {/* Salary + timezone */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 18,
                }}
              >
                <div>
                  <RangeSlider
                    value={form.salary}
                    min={80}
                    max={300}
                    step={5}
                    label="Salary floor"
                    format={(v) => `$${v}k+`}
                    onChange={onSalary}
                  />
                </div>
                <div>
                  <label style={BLOCK_LABEL}>Timezone overlap</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      height: 36,
                      padding: "0 12px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    <span style={{ font: "var(--mono-base)", color: "var(--text-hi)" }}>
                      {form.timezone} ±4h
                    </span>
                    <Icon
                      name="chevron-down"
                      size={14}
                      style={{ color: "var(--text-low-content)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Remote policy */}
              <div>
                <label style={BLOCK_LABEL}>Remote policy</label>
                <SegmentedControl
                  options={REMOTE_OPTIONS}
                  value={form.remote}
                  onChange={onRemote}
                />
              </div>

              {/* Company stage */}
              <div>
                <label style={{ ...BLOCK_LABEL, marginBottom: 10 }}>Company stage</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px" }}>
                  {STAGE_OPTIONS.map((stage) => {
                    const on = form.stages.includes(stage.id);
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => toggleStage(stage.id)}
                        aria-pressed={on}
                        className="inline-flex cursor-pointer items-center border-none bg-transparent p-0"
                        style={{ gap: 8 }}
                      >
                        <span
                          aria-hidden
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 18,
                            height: 18,
                            borderRadius: "var(--radius-sm)",
                            flexShrink: 0,
                            background: on ? "var(--phosphor)" : "transparent",
                            border: `1px solid ${on ? "var(--phosphor)" : "var(--border-strong)"}`,
                          }}
                        >
                          {on ? (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#04130C"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                        </span>
                        <span
                          style={{
                            font: "var(--text-sm)",
                            color: on ? "var(--text-hi)" : "var(--text-low-content)",
                          }}
                        >
                          {stage.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dealbreakers */}
              <div>
                <label style={BLOCK_LABEL}>Dealbreakers</label>
                <div style={CHIP_ROW}>
                  {form.dealbreakers.map((db) => (
                    <Tag
                      key={db}
                      tone="amber"
                      selected
                      onRemove={() => removeDealbreaker(db)}
                    >
                      {db}
                    </Tag>
                  ))}
                  <AddChip label="+ add" onClick={addDealbreaker} />
                </div>
              </div>
            </div>
          </section>

          {/* 03 AGENT INSTRUCTIONS */}
          <section>
            <SectionHeader label="03 · Agent instructions" color="var(--violet)" />
            <label htmlFor="agent-instructions" style={BLOCK_LABEL}>
              Anything else the agent should weigh?
            </label>
            <textarea
              id="agent-instructions"
              value={form.agentInstructions}
              onChange={(e) => patch({ agentInstructions: e.target.value })}
              placeholder="Prefer products I'd actually use; weight AI-native teams higher."
              style={AGENT_TEXTAREA}
            />
          </section>

          {dirty ? (
            <DirtyBar
              onSave={doSave}
              onDiscard={() => setConfirmOpen(true)}
              saving={isPending}
            />
          ) : null}
        </div>

        {/* ===== RIGHT — LIVE PREVIEW ===== */}
        <div style={{ position: "sticky", top: 0 }}>
          {previewDegraded ? (
            <PreviewDegraded />
          ) : (
            <PreviewPanel
              form={form}
              narrative={narrative}
              version={version}
              lastRunId={runId}
              shimmer={shimmer}
              onSave={doSave}
              saving={isPending}
            />
          )}
        </div>
      </div>

      {/* Toasts — fixed, glass, bottom-right */}
      {saveToast ? (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 50,
          }}
        >
          <Toast
            tone={saveToast.tone}
            title={
              saveToast.tone === "error"
                ? "Couldn't save profile"
                : "Calibration saved"
            }
            message={
              saveToast.tone === "error"
                ? "The server didn't respond. Your edits are still here."
                : saveToast.message
            }
            action={saveToast.tone === "error" ? "retry" : undefined}
            actionLabel={saveToast.tone === "error" ? "Retry" : undefined}
            onAction={saveToast.tone === "error" ? doSave : undefined}
            onClose={() => setSaveToast(null)}
          />
        </div>
      ) : null}

      <ConfirmModal
        open={confirmOpen}
        title="Discard calibration changes?"
        message="Your unsaved edits will be lost. The last saved version stays intact."
        confirmLabel="Discard"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={discard}
      />
    </div>
  );
}

/* ---- inline parsing indicator (skeleton chips while Groq runs) ---------- */
function ParsingIndicator() {
  return (
    <div style={{ margin: "18px 0 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 16,
        }}
      >
        <span
          data-shimmer
          className="hr-cv-spin"
          aria-hidden
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid var(--violet-16)",
            borderTopColor: "var(--violet)",
          }}
        />
        <span style={{ font: "var(--text-sm)", color: "var(--violet)" }}>
          Extracting skills…
        </span>
        <style href="hr-cv-spin" precedence="medium">
          {`.hr-cv-spin{animation:hr-cv-rotate .8s linear infinite}
@keyframes hr-cv-rotate{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.hr-cv-spin{animation:none}}`}
        </style>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div data-shimmer style={{ ...VIOLET_SHIMMER, width: 74, height: 11, borderRadius: 3 }} />
            <div style={{ flex: 1, display: "flex", gap: 7 }}>
              <div data-shimmer style={{ ...VIOLET_SHIMMER, width: 80, height: 24 }} />
              <div data-shimmer style={{ ...VIOLET_SHIMMER, width: 64, height: 24 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center border-none bg-transparent"
      style={{
        gap: 5,
        height: 24,
        padding: "0 9px",
        font: "var(--mono-sm)",
        color: "var(--text-low-content)",
        border: "1px dashed var(--border)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {label}
    </button>
  );
}

const CV_TEXTAREA: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  minHeight: 120,
  padding: "13px 15px",
  background: "var(--bg-void)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
  color: "var(--text-mid)",
  font: "var(--mono-sm)",
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
};

const AGENT_TEXTAREA: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  minHeight: 84,
  padding: "13px 15px",
  background: "var(--violet-12)",
  border: "1px solid rgba(167,139,250,0.32)",
  borderRadius: "var(--radius-control)",
  color: "var(--text-hi)",
  font: "var(--mono-sm)",
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
};

const BLOCK_LABEL: CSSProperties = {
  display: "block",
  font: "var(--text-sm)",
  color: "var(--text-mid)",
  marginBottom: 8,
};

const CHIP_ROW: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 7,
  alignItems: "center",
};

const VIOLET_SHIMMER: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(167,139,250,0.08), rgba(167,139,250,0.22), rgba(167,139,250,0.08))",
  backgroundSize: "200% 100%",
  borderRadius: "var(--radius-sm)",
  animation: "hr-shimmer 1.4s linear infinite",
};
