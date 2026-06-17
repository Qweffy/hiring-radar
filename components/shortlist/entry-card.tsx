"use client";

import { Bot } from "lucide-react";
import  { type ChangeEvent } from "react";

import { EntryKebab } from "@/components/shortlist/entry-kebab";
import { EntryNotes } from "@/components/shortlist/entry-notes";
import { MatchGauge } from "@/components/shortlist/match-gauge";
import {
  badgeLabel,
  badgeStyle,
  cardStyle,
  formatSalary,
  hnUrl,
  selectStyle,
  STAGE_OPTIONS,
  whyLine,
} from "@/components/shortlist/view-model";
import { Tag } from "@/components/ui/tag";
import  {
  type ShortlistItem,
  type ShortlistNote,
  type ShortlistStage,
} from "@/lib/queries/shortlist";


export interface EntryCardProps {
  item: ShortlistItem;
  /** Currently-displayed stage (optimistic — may differ from item.stage). */
  stage: ShortlistStage;
  /** True while the revert shake plays after a failed stage change. */
  shaking: boolean;
  notes: ShortlistNote[];
  kebabOpen: boolean;
  savingNote: boolean;
  onStageChange: (stage: ShortlistStage) => void;
  onKebabToggle: () => void;
  onKebabClose: () => void;
  onReassess: () => void;
  onRemove: () => void;
  onAddNote: (body: string) => Promise<boolean>;
}

/**
 * The wide stage-tinted shortlist card: left column (badge / company / role /
 * salary / stack), the agent WHY line in the center, and the match gauge +
 * stage select + kebab on the right, with a collapsible notes footer.
 */
export function EntryCard({
  item,
  stage,
  shaking,
  notes,
  kebabOpen,
  savingNote,
  onStageChange,
  onKebabToggle,
  onKebabClose,
  onReassess,
  onRemove,
  onAddNote,
}: EntryCardProps) {
  const why = whyLine(item);
  const salary = formatSalary(item);

  const handleStage = (event: ChangeEvent<HTMLSelectElement>) => {
    onStageChange(event.target.value as ShortlistStage);
  };

  return (
    <div className={shaking ? "hr-sl-shake" : undefined} style={cardStyle(stage)}>
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
          padding: "18px 20px",
        }}
      >
        {/* LEFT */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span style={badgeStyle(item)}>{badgeLabel(item)}</span>
          <div style={{ font: "600 16px/1.25 var(--font-ui)", color: "var(--text-hi)" }}>
            {item.company ?? "Unknown company"}
          </div>
          <div style={{ font: "var(--text-sm)", color: "var(--text-mid)" }}>
            {item.role ?? "—"}
          </div>
          {salary ? (
            <div style={{ font: "var(--mono-base)", color: "var(--phosphor)" }}>
              {salary}
            </div>
          ) : null}
          {item.stackTags.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 2,
              }}
            >
              {item.stackTags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ) : null}
        </div>

        {/* CENTER — agent WHY */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 24 }}>
          {why ? (
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <Bot
                size={15}
                strokeWidth={1.5}
                aria-hidden
                style={{ color: "var(--violet)", flexShrink: 0, marginTop: 2 }}
              />
              <p
                style={{
                  margin: 0,
                  font: "italic 14px/1.5 var(--font-ui)",
                  color: "var(--text-mid)",
                }}
              >
                {why}
              </p>
            </div>
          ) : null}
        </div>

        {/* RIGHT */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
            paddingTop: 18,
          }}
        >
          {item.matchScore !== null ? <MatchGauge match={item.matchScore} /> : null}
          <select
            value={stage}
            onChange={handleStage}
            aria-label={`Stage for ${item.company ?? "role"}`}
            style={selectStyle(stage)}
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <EntryKebab
            open={kebabOpen}
            onToggle={onKebabToggle}
            onClose={onKebabClose}
            hnUrl={hnUrl(item.hnId)}
            onReassess={onReassess}
            onRemove={onRemove}
          />
        </div>
      </div>

      <EntryNotes notes={notes} onAddNote={onAddNote} saving={savingNote} />
    </div>
  );
}
