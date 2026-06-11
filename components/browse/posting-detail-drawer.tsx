"use client";

import type { CSSProperties, ReactNode } from "react";
import type { PostingDetail, PostingRow } from "@/lib/queries/postings";
import { formatMonth, formatSalary, relativeTime } from "@/lib/format";
import { Banner } from "@/components/ui/banner";
import { Drawer } from "@/components/ui/drawer";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tag } from "@/components/ui/tag";

export interface PostingDetailDrawerProps {
  detail: PostingDetail | null;
  selectedHnId: number;
  /** Current page rows — prev/next walk these. */
  rows: PostingRow[];
  now: number;
  onClose: () => void;
  onNavigate: (hnId: number) => void;
}

const footerButtonStyle = (enabled: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 30,
  padding: "0 11px",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
  font: "var(--mono-sm)",
  color: enabled ? "var(--text-mid)" : "var(--text-low)",
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.5,
  whiteSpace: "nowrap",
});

function FieldCell({
  label,
  value,
  fullRow = false,
}: {
  label: string;
  /** null renders the "—" missing marker with a title tooltip. */
  value: ReactNode | null;
  fullRow?: boolean;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: 4, gridColumn: fullRow ? "1 / -1" : undefined }}
    >
      <span className="hr-label">{label}</span>
      {value !== null ? (
        <span style={{ font: "var(--mono-base)", color: "var(--text-hi)" }}>{value}</span>
      ) : (
        <span
          title="Not stated in the posting"
          style={{ font: "var(--mono-base)", color: "var(--text-low)", cursor: "help" }}
        >
          —
        </span>
      )}
    </div>
  );
}

/** Violet agent panel — M1 renders only its empty variant (agent lands later). */
function MatchPanelEmpty() {
  return (
    <div
      className="flex flex-col"
      style={{
        gap: 14,
        padding: 18,
        background: "var(--violet-12)",
        border: "1px solid color-mix(in srgb, var(--violet) 32%, transparent)",
        borderRadius: "var(--radius-card)",
        boxShadow: "0 0 24px color-mix(in srgb, var(--violet) 10%, transparent)",
      }}
    >
      <span
        className="hr-label"
        style={{ color: "var(--violet)" }}
      >
        Agent match
      </span>
      <div
        className="flex flex-col items-center text-center"
        style={{ gap: 10, padding: "14px 8px" }}
      >
        <HRIllustration name="agent-orb-idle" size={64} />
        <span style={{ font: "600 15px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
          Not assessed yet
        </span>
        <span
          style={{ font: "var(--text-sm)", color: "var(--text-mid)", maxWidth: 280 }}
        >
          Ask the agent to score this posting against your profile.
        </span>
      </div>
    </div>
  );
}

function ContactValue({ contact }: { contact: string }) {
  const linkStyle: CSSProperties = {
    font: "var(--mono-base)",
    color: "var(--cyan)",
    textDecoration: "none",
    overflowWrap: "anywhere",
  };
  if (contact.includes("@") && !contact.startsWith("http")) {
    return (
      <a href={`mailto:${contact}`} style={linkStyle}>
        {contact}
      </a>
    );
  }
  if (contact.startsWith("http")) {
    return (
      <a href={contact} target="_blank" rel="noreferrer" style={linkStyle}>
        {contact}
      </a>
    );
  }
  return <span style={{ overflowWrap: "anywhere" }}>{contact}</span>;
}

function DetailBody({ detail, now }: { detail: PostingDetail; now: number }) {
  const nowDate = new Date(now);
  const salaryRange = formatSalary(detail.salaryMin, detail.salaryMax, detail.salaryCurrency);
  const salaryValue =
    salaryRange !== "—" ? salaryRange : detail.salaryRaw !== null ? detail.salaryRaw : null;
  const sourceUrl = `https://news.ycombinator.com/item?id=${detail.hnId}`;

  return (
    <div className="flex flex-col" style={{ gap: 22, padding: 4 }}>
      {/* Low-confidence / failed parse notice */}
      {detail.parseStatus !== "parsed" ? (
        <Banner tone="amber">
          {detail.parseStatus === "failed"
            ? "Parsing failed — the original text below is the source of truth."
            : "Parsed with low confidence — check the original text below."}
        </Banner>
      ) : null}

      {/* Header block */}
      <div>
        <div className="flex flex-wrap items-center" style={{ gap: 8, marginBottom: 10 }}>
          {detail.isNew ? <StatusBadge status="NEW" /> : null}
          {detail.remotePolicy !== null ? (
            <StatusBadge status={detail.remotePolicy.toUpperCase()} />
          ) : null}
          {detail.visaSponsorship === true ? <StatusBadge status="VISA" /> : null}
        </div>
        <h2
          style={{
            margin: "0 0 6px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: "var(--text-hi)",
          }}
        >
          {detail.company ?? "Unparsed posting"}
        </h2>
        {detail.role !== null ? (
          <p
            className="m-0"
            style={{ font: "var(--text-base)", color: "var(--text-mid)", marginBottom: 8 }}
          >
            {detail.role}
          </p>
        ) : null}
        <p
          className="m-0"
          style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}
        >
          by {detail.author} · posted {relativeTime(detail.hnCreatedAt, nowDate)}
        </p>
      </div>

      {/* Agent match — empty variant only in M1 */}
      <MatchPanelEmpty />

      {/* Structured fields */}
      <div className="grid grid-cols-2" style={{ gap: "16px 20px" }}>
        <FieldCell label="Salary" value={salaryValue} />
        <FieldCell label="Location" value={detail.location} />
        <FieldCell label="Remote policy" value={detail.remotePolicy} />
        <FieldCell label="Company stage" value={detail.companyStage} />
        <FieldCell
          label="Visa sponsorship"
          value={
            detail.visaSponsorship === null ? null : detail.visaSponsorship ? "yes" : "no"
          }
        />
        <FieldCell label="Month" value={formatMonth(detail.month)} />
        <FieldCell
          label="Stack"
          fullRow
          value={
            detail.stackTags.length > 0 ? (
              <span className="flex flex-wrap" style={{ gap: 6 }}>
                {detail.stackTags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </span>
            ) : null
          }
        />
        <FieldCell
          label="Contact"
          fullRow
          value={detail.contact !== null ? <ContactValue contact={detail.contact} /> : null}
        />
      </div>

      {/* Original posting — the raw text is always the fallback */}
      <div>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
          <span className="hr-label">Source ·</span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center"
            style={{
              gap: 5,
              font: "var(--mono-sm)",
              color: "var(--cyan)",
              textDecoration: "none",
            }}
          >
            news.ycombinator.com/item?id={detail.hnId}
            <Icon name="external-link" size={12} />
          </a>
        </div>
        <div
          className="whitespace-pre-wrap"
          style={{
            padding: "18px 20px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--phosphor)",
            borderRadius: "var(--radius-control)",
            font: "14px/1.65 var(--font-ui)",
            color: "var(--text-mid)",
            overflowWrap: "anywhere",
          }}
        >
          {detail.rawText}
        </div>
      </div>
    </div>
  );
}

function MissingBody() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ gap: 10, padding: 30, minHeight: 320 }}
    >
      <HRIllustration name="off-the-grid" size={112} />
      <span style={{ font: "600 15px/1.3 var(--font-ui)", color: "var(--text-hi)" }}>
        This posting doesn&apos;t exist
      </span>
      <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
        It was deleted, or the link is wrong.
      </span>
    </div>
  );
}

export function PostingDetailDrawer({
  detail,
  selectedHnId,
  rows,
  now,
  onClose,
  onNavigate,
}: PostingDetailDrawerProps) {
  const index = rows.findIndex((r) => r.hnId === selectedHnId);
  const prev = index > 0 ? rows[index - 1] : null;
  const next = index >= 0 && index < rows.length - 1 ? rows[index + 1] : null;

  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={<span className="hr-label">Posting</span>}
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            disabled={prev === null}
            onClick={() => prev !== null && onNavigate(prev.hnId)}
            className={prev !== null ? "enabled:hover:[border-color:var(--border-strong)]" : undefined}
            style={footerButtonStyle(prev !== null)}
          >
            <Icon name="chevron-left" size={13} />
            Prev
            <Kbd style={{ marginLeft: 2, minWidth: 18, height: 18 }}>k</Kbd>
          </button>
          {index >= 0 ? (
            <span style={{ font: "var(--mono-sm)", color: "var(--text-low-content)" }}>
              {index + 1} / {rows.length}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={next === null}
            onClick={() => next !== null && onNavigate(next.hnId)}
            className={next !== null ? "enabled:hover:[border-color:var(--border-strong)]" : undefined}
            style={footerButtonStyle(next !== null)}
          >
            <Kbd style={{ marginRight: 2, minWidth: 18, height: 18 }}>j</Kbd>
            Next
            <Icon name="chevron-right" size={13} />
          </button>
        </div>
      }
    >
      {detail !== null ? <DetailBody detail={detail} now={now} /> : <MissingBody />}
    </Drawer>
  );
}
