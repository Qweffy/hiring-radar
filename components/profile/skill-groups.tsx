"use client";

import { GROUP_DEFS, TONE_OF, type Skill } from "@/components/profile/types";
import { Tag } from "@/components/ui/tag";

interface SkillGroupsProps {
  skills: Skill[];
  /** Cycle a skill core → familiar → learning → core. */
  onCycle: (name: string) => void;
}

/**
 * Parsed skills rendered as three labelled rows (CORE / FAMILIAR / LEARNING).
 * Each tag is interactive: clicking it advances the skill's depth bucket, which
 * re-tones the tag and moves it to the next group.
 */
export function SkillGroups({ skills, onCycle }: SkillGroupsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {GROUP_DEFS.map((g) => {
        const tags = skills.filter((s) => s.g === g.key);
        return (
          <div
            key={g.key}
            style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
          >
            <span
              style={{
                width: 74,
                flexShrink: 0,
                paddingTop: 4,
                font: "600 10px/1.4 var(--font-mono)",
                letterSpacing: "0.1em",
                color: g.color,
              }}
            >
              {g.label}
            </span>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                minHeight: 24,
              }}
            >
              {tags.map((t) => (
                <Tag
                  key={t.name}
                  tone={TONE_OF[g.key]}
                  selected
                  role="button"
                  tabIndex={0}
                  aria-label={`${t.name} — ${g.label.toLowerCase()}, click to recategorize`}
                  onClick={() => onCycle(t.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onCycle(t.name);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {t.name}
                </Tag>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
