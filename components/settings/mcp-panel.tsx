"use client";

import  { type CSSProperties } from "react";

import { CopyButton } from "@/components/settings/copy-button";
import { pickConnectedClient, type KeyView } from "@/components/settings/types";
import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";

/**
 * MCP & API access panel. Lists keys (name/scope/created/last-used + revoke),
 * shows the one-time reveal after a generate, surfaces a generation error as a
 * recoverable empty state, and renders the copyable connection recipes (stdio
 * bridge config + the HTTP endpoint + bearer instructions). The live "connected
 * clients" indicator is derived from each key's recent last-used timestamp.
 */
export interface RevealedKey {
  raw: string;
  name: string;
  scopeLabel: string;
}

export interface McpPanelProps {
  keys: KeyView[];
  httpEndpoint: string;
  stdioConfig: string;
  /** Set immediately after a successful generate — the one-time reveal. */
  revealed: RevealedKey | null;
  /** Set when the last generate attempt failed — shows the retry empty state. */
  genError: string | null;
  generating: boolean;
  onGenerate: () => void;
  onRetryGenerate: () => void;
  onRevoke: (key: KeyView) => void;
  /** Id of the key whose revoke is in flight (disables its action). */
  revokingId: number | null;
}

export function McpPanel({
  keys,
  httpEndpoint,
  stdioConfig,
  revealed,
  genError,
  generating,
  onGenerate,
  onRetryGenerate,
  onRevoke,
  revokingId,
}: McpPanelProps) {
  const connected = pickConnectedClient(keys);

  return (
    <div>
      {/* connected clients */}
      {connected ? (
        <div style={CONNECTED_BANNER}>
          <span style={DOT_WRAP}>
            <span style={DOT_BASE} />
            <span style={{ ...DOT_BASE, animation: "hr-dotping 1.8s var(--ease-out) infinite" }} />
          </span>
          <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-hi)" }}>
            {connected.name}{" "}
            <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
              · last call {connected.lastUsedLabel}
            </span>
          </span>
          <span style={CONNECTED_TAG}>Connected</span>
        </div>
      ) : (
        <div style={IDLE_BANNER}>
          <span style={{ ...DOT_BASE, position: "static", background: "var(--text-low)" }} />
          <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-low-content)" }}>
            No clients connected recently.
          </span>
        </div>
      )}

      {/* api keys header */}
      <div style={{ ...ROW_BETWEEN, marginBottom: 10 }}>
        <span style={LABEL_MONO}>API keys</span>
        <Button
          variant="ghost"
          size="sm"
          iconLeft="zap"
          loading={generating}
          onClick={onGenerate}
        >
          Generate key
        </Button>
      </div>

      {/* key list / gen-error / empty */}
      {genError !== null ? (
        <div style={GEN_ERROR_BOX}>
          <HRIllustration name="static-interference" size={76} />
          <span style={{ font: "600 14px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
            Couldn&apos;t generate the key
          </span>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            {genError}
          </span>
          <div style={{ marginTop: 4 }}>
            <Button variant="secondary" iconLeft="retry" onClick={onRetryGenerate}>
              Retry
            </Button>
          </div>
        </div>
      ) : keys.length === 0 ? (
        <div style={EMPTY_KEYS_BOX}>
          <span style={{ font: "var(--text-sm)", color: "var(--text-hi)" }}>
            No API keys yet
          </span>
          <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
            Generate one to connect Claude or another MCP client.
          </span>
        </div>
      ) : (
        <div style={KEY_TABLE}>
          <div style={{ ...KEY_GRID, ...KEY_HEAD }}>
            <span style={COL_HEAD}>Name</span>
            <span style={COL_HEAD}>Scope</span>
            <span style={COL_HEAD}>Created</span>
            <span style={COL_HEAD}>Last used</span>
            <span />
          </div>
          {keys.map((k) => (
            <div key={k.id} style={{ ...KEY_GRID, ...KEY_ROW, opacity: k.revoked ? 0.55 : 1 }}>
              <span
                style={{
                  font: "var(--mono-base)",
                  color: k.revoked ? "var(--text-low)" : "var(--text-hi)",
                  textDecoration: k.revoked ? "line-through" : "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {k.name}
              </span>
              <span style={scopeBadge(k)}>{k.scopeLabel}</span>
              <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
                {k.createdLabel}
              </span>
              <span style={{ font: "var(--mono-sm)", color: "var(--text-mid)" }}>
                {k.lastUsedLabel}
              </span>
              {k.revoked ? (
                <span style={{ font: "var(--mono-sm)", color: "var(--red)", justifySelf: "start" }}>
                  revoked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onRevoke(k)}
                  disabled={revokingId === k.id}
                  className="cursor-pointer border-none bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ font: "var(--mono-sm)", color: "var(--red)", justifySelf: "start" }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* one-time reveal */}
      {revealed !== null ? (
        <div style={REVEAL_BOX}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="alert-triangle" size={14} style={{ color: "var(--amber)" }} />
            <span style={{ font: "var(--text-sm)", color: "var(--amber)" }}>
              Copy it now — it won&apos;t be shown again.
            </span>
          </div>
          <div style={REVEAL_FIELD}>
            <span
              style={{
                flex: 1,
                font: "var(--mono-sm)",
                color: "var(--text-hi)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {revealed.raw}
            </span>
            <CopyButton value={revealed.raw} label="Copy API key" iconOnly />
          </div>
          <div style={{ font: "var(--mono-sm)", color: "var(--text-low-content)", marginTop: 12 }}>
            {revealed.name} · scope {revealed.scopeLabel} · created just now
          </div>
        </div>
      ) : null}

      {/* connection recipes */}
      <div style={{ ...ROW_BETWEEN, margin: "20px 0 10px" }}>
        <span style={LABEL_MONO}>Claude Desktop config (stdio bridge)</span>
        <CopyButton value={stdioConfig} label="Copy Claude Desktop config" />
      </div>
      <pre style={CODE_BLOCK}>{stdioConfig}</pre>

      <div style={{ ...ROW_BETWEEN, margin: "18px 0 10px" }}>
        <span style={LABEL_MONO}>HTTP endpoint</span>
        <CopyButton value={httpEndpoint} label="Copy HTTP endpoint" />
      </div>
      <div style={ENDPOINT_FIELD}>
        <span
          style={{
            flex: 1,
            font: "var(--mono-sm)",
            color: "var(--text-hi)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {httpEndpoint}
        </span>
      </div>
      <p style={{ margin: "10px 0 0", font: "var(--text-sm)", color: "var(--text-low-content)" }}>
        Authenticate every request with{" "}
        <code style={INLINE_CODE}>Authorization: Bearer &lt;your-key&gt;</code> — bearer header
        only, never a query string. Remote Claude Desktop connects via custom connector;
        local clients bridge the endpoint with <code style={INLINE_CODE}>mcp-remote</code>.
      </p>
    </div>
  );
}

function scopeBadge(k: KeyView): CSSProperties {
  const isWrite = k.scope === "read_write";
  return {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    height: 20,
    padding: "0 7px",
    font: "600 10px/1 var(--font-mono)",
    letterSpacing: "0.06em",
    borderRadius: "var(--radius-sm)",
    whiteSpace: "nowrap",
    color: isWrite ? "var(--cyan)" : "var(--text-mid)",
    border: `1px solid ${isWrite ? "rgba(76,201,240,0.35)" : "var(--border)"}`,
    background: isWrite ? "var(--cyan-12)" : "transparent",
  };
}

const CONNECTED_BANNER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "12px 14px",
  marginBottom: 18,
  background: "var(--phosphor-08)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-control)",
};

const IDLE_BANNER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "12px 14px",
  marginBottom: 18,
  background: "var(--bg-void)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
};

const DOT_WRAP: CSSProperties = {
  position: "relative",
  width: 8,
  height: 8,
  flexShrink: 0,
};

const DOT_BASE: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--phosphor)",
};

const CONNECTED_TAG: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--phosphor)",
};

const ROW_BETWEEN: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const LABEL_MONO: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

const KEY_TABLE: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
  overflow: "hidden",
};

const KEY_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1.3fr) 110px 110px 100px 70px",
  gap: 12,
  alignItems: "center",
};

const KEY_HEAD: CSSProperties = {
  padding: "9px 14px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-raised)",
};

const KEY_ROW: CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid var(--divider)",
};

const COL_HEAD: CSSProperties = {
  font: "var(--label-mono)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--text-low)",
};

const REVEAL_BOX: CSSProperties = {
  padding: 14,
  marginTop: 18,
  background: "var(--bg-void)",
  border: "1px solid var(--amber)",
  borderRadius: "var(--radius-control)",
  boxShadow: "0 0 18px rgba(255,200,87,0.12)",
};

const REVEAL_FIELD: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
};

const GEN_ERROR_BOX: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 10,
  padding: "30px 20px",
  background: "var(--bg-void)",
  border: "1px solid rgba(255,93,93,0.32)",
  borderRadius: "var(--radius-control)",
};

const EMPTY_KEYS_BOX: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 6,
  padding: "26px 20px",
  background: "var(--bg-void)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
};

const CODE_BLOCK: CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  background: "var(--bg-void)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
  font: "var(--mono-sm)",
  lineHeight: 1.6,
  color: "var(--text-mid)",
  overflow: "auto",
  whiteSpace: "pre",
};

const ENDPOINT_FIELD: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: "var(--bg-void)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
};

const INLINE_CODE: CSSProperties = {
  font: "var(--mono-sm)",
  color: "var(--text-mid)",
};
