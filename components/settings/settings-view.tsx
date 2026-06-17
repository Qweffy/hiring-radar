"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
  type CSSProperties,
} from "react";

import {
  generateApiKey,
  purgeData,
  reindexEmbeddings,
  revokeApiKeyAction,
  runSweepNow,
  saveAppSettings,
} from "@/app/(app)/settings/actions";
import { McpPanel, type RevealedKey } from "@/components/settings/mcp-panel";
import { SectionCard } from "@/components/settings/section-card";
import { SettingsConfirm } from "@/components/settings/settings-confirm";
import {
  type KeyView,
  type NotificationsState,
  type SettingsObjectCounts,
} from "@/components/settings/types";
import { Button } from "@/components/ui/button";
import { type IconName } from "@/components/ui/icon";
import { RangeSlider } from "@/components/ui/range-slider";
import { Toast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";

const STEP_MIN = 5;
const STEP_MAX = 50;
const COST_MIN = 0.05;
const COST_MAX = 100;

type ToastState = { tone: "success" | "error"; title: string; message: string } | null;

/** Which destructive/confirm action the modal is gating. */
type Pending =
  | { kind: "sweep" }
  | { kind: "reindex" }
  | { kind: "purge" }
  | { kind: "revoke"; key: KeyView }
  | null;

interface SettingsViewProps {
  initialStepBudget: number;
  initialCostCap: number;
  initialNotifications: NotificationsState;
  model: string;
  sweepCron: string;
  sweepFrequencyLabel: string;
  keys: KeyView[];
  objectCounts: SettingsObjectCounts;
  httpEndpoint: string;
  stdioConfig: string;
}

/**
 * Settings — the interactive admin screen. Owns the limits/notifications form
 * model with dirty tracking (a sticky bar saves everything atomically), the
 * sweep/re-index/purge confirm flow, and the MCP key lifecycle (generate →
 * one-time reveal, revoke). Product invariants from the spec: nothing saves
 * silently (the dirty bar gates every limit/toggle change), a raw key is shown
 * exactly once, and destructive actions always restate the object first.
 */
export function SettingsView({
  initialStepBudget,
  initialCostCap,
  initialNotifications,
  model,
  sweepCron,
  sweepFrequencyLabel,
  keys,
  objectCounts,
  httpEndpoint,
  stdioConfig,
}: SettingsViewProps) {
  // --- saveable form model + dirty tracking ---
  const baseline = useMemo(
    () => ({
      stepBudget: initialStepBudget,
      costCap: initialCostCap,
      notifications: initialNotifications,
    }),
    [initialStepBudget, initialCostCap, initialNotifications],
  );

  const [stepBudget, setStepBudget] = useState(initialStepBudget);
  const [costCapText, setCostCapText] = useState(initialCostCap.toFixed(2));
  const [notifications, setNotifications] = useState<NotificationsState>(initialNotifications);
  const [savedBaseline, setSavedBaseline] = useState(baseline);

  const costCap = Number.parseFloat(costCapText);
  const costCapValid = Number.isFinite(costCap) && costCap >= COST_MIN && costCap <= COST_MAX;

  const dirty =
    stepBudget !== savedBaseline.stepBudget ||
    !approxEqual(costCap, savedBaseline.costCap) ||
    notifications.sweep !== savedBaseline.notifications.sweep ||
    notifications.agentRun !== savedBaseline.notifications.agentRun ||
    notifications.highMatch !== savedBaseline.notifications.highMatch;

  // --- transient UI state ---
  const [toast, setToast] = useState<ToastState>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [revealed, setRevealed] = useState<RevealedKey | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const [isSaving, startSave] = useTransition();
  const [isGenerating, startGenerate] = useTransition();
  const [isActing, startAction] = useTransition();

  // --- save (limits + notifications) ---
  const onSave = useCallback(() => {
    if (!costCapValid) {
      setToast({
        tone: "error",
        title: "Cost cap out of range",
        message: `Enter a value between $${COST_MIN.toFixed(2)} and $${String(COST_MAX)}.`,
      });
      return;
    }
    setToast(null);
    startSave(async () => {
      const res = await saveAppSettings({
        agentStepBudget: stepBudget,
        agentMaxUsd: costCap,
        notifySweep: notifications.sweep,
        notifyAgentRun: notifications.agentRun,
        notifyHighMatch: notifications.highMatch,
      });
      if (!res.ok) {
        setToast({ tone: "error", title: "Couldn't save settings", message: res.error });
        return;
      }
      setSavedBaseline({
        stepBudget: res.data.agentStepBudget,
        costCap: res.data.agentMaxUsd,
        notifications,
      });
      setStepBudget(res.data.agentStepBudget);
      setCostCapText(res.data.agentMaxUsd.toFixed(2));
      setToast({ tone: "success", title: "Settings saved", message: "Agent limits and notifications updated." });
    });
  }, [stepBudget, costCap, costCapValid, notifications]);

  const onDiscard = useCallback(() => {
    setStepBudget(savedBaseline.stepBudget);
    setCostCapText(savedBaseline.costCap.toFixed(2));
    setNotifications(savedBaseline.notifications);
    setToast(null);
  }, [savedBaseline]);

  // --- key generate ---
  const doGenerate = useCallback(() => {
    setGenError(null);
    setRevealed(null);
    startGenerate(async () => {
      // A single fixed-scope key per the design's "New key · claude-desktop"
      // reveal — read+write, named for the connecting client.
      const res = await generateApiKey({ name: "claude-desktop", scope: "read_write" });
      if (!res.ok) {
        setGenError(res.error);
        return;
      }
      setRevealed({ raw: res.data.raw, name: res.data.name, scopeLabel: "read+write" });
    });
  }, []);

  // --- confirm-gated actions ---
  const onConfirm = useCallback(() => {
    const current = pending;
    if (current === null) return;
    setPending(null);
    setToast(null);

    if (current.kind === "revoke") {
      setRevokingId(current.key.id);
    }

    startAction(async () => {
      if (current.kind === "sweep") {
        const res = await runSweepNow();
        setToast(
          res.ok
            ? { tone: "success", title: "Sweep requested", message: `Sweeping the ${res.data.month} thread now.` }
            : { tone: "error", title: "Couldn't start the sweep", message: res.error },
        );
        return;
      }
      if (current.kind === "reindex") {
        const res = await reindexEmbeddings();
        setToast(
          res.ok
            ? { tone: "success", title: "Re-index queued", message: res.data.note }
            : { tone: "error", title: "Couldn't re-index", message: res.error },
        );
        return;
      }
      if (current.kind === "purge") {
        const res = await purgeData();
        setToast(
          res.ok
            ? { tone: "success", title: "Data purged", message: "All postings, runs and shortlist entries were deleted." }
            : { tone: "error", title: "Couldn't purge the data", message: res.error },
        );
        return;
      }
      // revoke
      const res = await revokeApiKeyAction({ id: current.key.id });
      setRevokingId(null);
      setToast(
        res.ok
          ? {
              tone: "success",
              title: "Key revoked",
              message: `'${current.key.name}' can no longer access your radar.`,
            }
          : { tone: "error", title: "Couldn't revoke the key", message: res.error },
      );
    });
  }, [pending]);

  const modal = useMemo(() => modalCopy(pending, objectCounts), [pending, objectCounts]);

  const setNotif = useCallback((id: keyof NotificationsState, value: boolean) => {
    setNotifications((n) => ({ ...n, [id]: value }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-auto">
      <style href="hr-settings-anim" precedence="medium">
        {`@keyframes hr-dotping{0%{transform:scale(1);opacity:0.6}80%,100%{transform:scale(2.6);opacity:0}}
@media (prefers-reduced-motion:reduce){[style*="hr-dotping"]{animation:none!important}}`}
      </style>

      <div style={WRAP}>
        {/* 1 AGENT LIMITS */}
        <SectionCard title="Agent limits">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <RangeSlider
                value={stepBudget}
                min={STEP_MIN}
                max={STEP_MAX}
                step={1}
                label="Step budget"
                format={(v) => `MAX STEPS ${String(v)}`}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setStepBudget(Number.parseInt(e.target.value, 10))
                }
              />
              <p style={HELP}>Runs stop cleanly when the budget is reached — picks are kept.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label htmlFor="cost-cap" style={FIELD_LABEL}>
                  Cost cap per run
                </label>
                <div style={{ ...CONTROL, borderColor: costCapValid ? "var(--border)" : "var(--red)" }}>
                  <span style={{ font: "var(--mono-base)", color: "var(--text-low-content)", marginRight: 2 }}>
                    $
                  </span>
                  <input
                    id="cost-cap"
                    inputMode="decimal"
                    value={costCapText}
                    onChange={(e) => setCostCapText(e.target.value)}
                    style={COST_INPUT}
                  />
                  <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>per run</span>
                </div>
                <p style={HELP}>The run halts before exceeding this.</p>
              </div>
              <div>
                <span style={FIELD_LABEL}>Model</span>
                <div style={CONTROL}>
                  <span
                    style={{
                      flex: 1,
                      font: "var(--mono-base)",
                      color: "var(--text-hi)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {model}
                  </span>
                </div>
                <p style={HELP}>Used for parsing and matching.</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 2 SWEEP SCHEDULE */}
        <SectionCard title="Sweep schedule">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={LABEL_MONO}>Schedule (cron · UTC)</span>
              <div style={{ font: "var(--mono-lg)", color: "var(--text-hi)", marginTop: 6 }}>
                {sweepCron}
              </div>
            </div>
            <div style={{ width: 220 }}>
              <span style={FIELD_LABEL}>Frequency</span>
              <div style={CONTROL}>
                <span style={{ font: "var(--mono-sm)", color: "var(--text-hi)" }}>
                  {sweepFrequencyLabel}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              iconLeft="play"
              onClick={() => setPending({ kind: "sweep" })}
            >
              Run sweep now
            </Button>
          </div>
        </SectionCard>

        {/* 3 MCP & API ACCESS */}
        <SectionCard
          title="MCP & API access"
          tone="violet"
          subtitle="Expose your radar to Claude and other MCP clients."
        >
          <McpPanel
            keys={keys}
            httpEndpoint={httpEndpoint}
            stdioConfig={stdioConfig}
            revealed={revealed}
            genError={genError}
            generating={isGenerating}
            onGenerate={doGenerate}
            onRetryGenerate={doGenerate}
            onRevoke={(key) => setPending({ kind: "revoke", key })}
            revokingId={revokingId}
          />
        </SectionCard>

        {/* 4 DATA */}
        <SectionCard title="Data">
          <div style={DATA_ROW}>
            <div>
              <div style={DATA_TITLE}>Re-index embeddings</div>
              <div style={DATA_SUB}>Rebuilds all vectors · idempotent, safe to re-run.</div>
            </div>
            <Button variant="secondary" iconLeft="retry" onClick={() => setPending({ kind: "reindex" })}>
              Re-index
            </Button>
          </div>
          <div style={{ height: 1, background: "var(--divider)" }} />
          <div style={{ ...DATA_ROW, padding: "14px 0 0" }}>
            <div>
              <div style={DATA_TITLE}>Purge all data</div>
              <div style={DATA_SUB}>
                Deletes every posting, shortlist entry and run. Permanent.
              </div>
            </div>
            <Button
              variant="destructive"
              iconLeft="alert-triangle"
              onClick={() => setPending({ kind: "purge" })}
            >
              Purge all data
            </Button>
          </div>
        </SectionCard>

        {/* 5 NOTIFICATIONS */}
        <SectionCard title="Notifications">
          <NotifRow
            label="Sweep completed"
            checked={notifications.sweep}
            onChange={(v) => setNotif("sweep", v)}
          />
          <NotifRow
            label="Agent run finished"
            checked={notifications.agentRun}
            onChange={(v) => setNotif("agentRun", v)}
          />
          <NotifRow
            label="New ≥ 90 match found"
            checked={notifications.highMatch}
            onChange={(v) => setNotif("highMatch", v)}
            last
          />
        </SectionCard>
      </div>

      {/* sticky unsaved-changes bar */}
      {dirty ? (
        <div style={DIRTY_BAR_WRAP}>
          <div style={DIRTY_BAR}>
            <span style={DIRTY_DOT} />
            <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-hi)" }}>
              Unsaved changes
            </span>
            <button
              type="button"
              onClick={onDiscard}
              className="cursor-pointer border-none bg-transparent p-0"
              style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
            >
              Discard
            </button>
            <Button variant="primary" size="sm" loading={isSaving} onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      ) : null}

      {/* toasts */}
      {toast ? (
        <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 50 }}>
          <Toast
            tone={toast.tone}
            title={toast.title}
            message={toast.message}
            action={toast.tone === "error" ? "retry" : undefined}
            actionLabel={toast.tone === "error" ? "Retry" : undefined}
            onAction={toast.tone === "error" ? onSave : undefined}
            onClose={() => setToast(null)}
          />
        </div>
      ) : null}

      <SettingsConfirm
        open={pending !== null}
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        confirmIcon={modal.confirmIcon}
        intent={modal.intent}
        busy={isActing}
        onCancel={() => setPending(null)}
        onConfirm={onConfirm}
      />
    </div>
  );
}

function approxEqual(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < 0.005;
}

interface ModalCopy {
  title: string;
  message: string;
  confirmLabel: string;
  confirmIcon: IconName;
  intent: "primary" | "destructive";
}

function modalCopy(pending: Pending, counts: SettingsObjectCounts): ModalCopy {
  if (pending?.kind === "sweep") {
    return {
      title: "Run a sweep now?",
      message:
        "Fetches the current HN thread and re-embeds any changes. Embeddings are content-hash idempotent, so a re-run is safe.",
      confirmLabel: "Run sweep",
      confirmIcon: "play",
      intent: "primary",
    };
  }
  if (pending?.kind === "reindex") {
    return {
      title: "Re-index all embeddings?",
      message:
        "Rebuilds every posting vector. Embeddings are idempotent (content-hash), so this is safe to re-run.",
      confirmLabel: "Re-index",
      confirmIcon: "retry",
      intent: "primary",
    };
  }
  if (pending?.kind === "revoke") {
    return {
      title: `Revoke key '${pending.key.name}'?`,
      message:
        "Any client using this key loses access immediately. This can't be undone.",
      confirmLabel: "Revoke key",
      confirmIcon: "alert-triangle",
      intent: "destructive",
    };
  }
  if (pending?.kind === "purge") {
    return {
      title: "Purge all data?",
      message: `Purge ${String(counts.postings)} postings, ${String(counts.shortlistEntries)} shortlist entries and ${String(counts.agentRuns)} runs? This permanently deletes everything and can't be undone.`,
      confirmLabel: "Purge everything",
      confirmIcon: "alert-triangle",
      intent: "destructive",
    };
  }
  return {
    title: "Confirm",
    message: "",
    confirmLabel: "Confirm",
    confirmIcon: "alert-triangle",
    intent: "primary",
  };
}

function NotifRow({
  label,
  checked,
  onChange,
  last = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 0",
        borderBottom: last ? "none" : "1px solid var(--divider)",
      }}
    >
      <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>{label}</span>
      <Toggle checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}

const WRAP: CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: "32px 24px 88px",
  display: "flex",
  flexDirection: "column",
  gap: 22,
};

const HELP: CSSProperties = {
  margin: "6px 0 0",
  font: "var(--text-sm)",
  color: "var(--text-low-content)",
};

const FIELD_LABEL: CSSProperties = {
  display: "block",
  font: "var(--text-sm)",
  color: "var(--text-mid)",
  marginBottom: 8,
};

const LABEL_MONO: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

const CONTROL: CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: 36,
  padding: "0 12px",
  background: "var(--bg-void)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
};

const COST_INPUT: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--text-hi)",
  font: "var(--mono-base)",
};

const DATA_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "14px 0",
};

const DATA_TITLE: CSSProperties = {
  font: "500 14px/1.3 var(--font-ui)",
  color: "var(--text-hi)",
};

const DATA_SUB: CSSProperties = {
  font: "var(--text-sm)",
  color: "var(--text-low-content)",
  marginTop: 3,
};

const DIRTY_BAR_WRAP: CSSProperties = {
  position: "sticky",
  bottom: 18,
  display: "flex",
  justifyContent: "center",
  padding: "0 24px",
  pointerEvents: "none",
};

const DIRTY_BAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  maxWidth: 920,
  padding: "12px 16px",
  background: "var(--surface-glass)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-control)",
  boxShadow: "var(--shadow-pop)",
  pointerEvents: "auto",
};

const DIRTY_DOT: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--amber)",
  boxShadow: "0 0 8px var(--amber)",
  flexShrink: 0,
};
