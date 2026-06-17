"use client";

import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { List, Plus } from "lucide-react";
import type { ShortlistNote } from "@/lib/queries/shortlist";
import { formatNoteTs } from "@/components/shortlist/view-model";

export interface EntryNotesProps {
  notes: ShortlistNote[];
  /** Persist a new note. Resolves false on failure so the editor stays open. */
  onAddNote: (body: string) => Promise<boolean>;
  saving: boolean;
}

/**
 * Collapsible notes footer: existing notes (newest-first), an "Add note…"
 * toggle, and a textarea editor. There's no explicit save button — the note
 * persists on blur or ⌘/Ctrl+Enter (and plain Enter), matching the production
 * behavior described in the spec.
 */
export function EntryNotes({ notes, onAddNote, saving }: EntryNotesProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = async () => {
    const body = draft.trim();
    if (body.length === 0) {
      setEditorOpen(false);
      setDraft("");
      return;
    }
    const ok = await onAddNote(body);
    if (ok) {
      setDraft("");
      setEditorOpen(false);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void commit();
    }
    if (event.key === "Escape") {
      setEditorOpen(false);
      setDraft("");
    }
  };

  return (
    <div style={{ padding: "0 20px 14px" }}>
      <div style={{ borderTop: "1px solid var(--divider)", paddingTop: 12 }}>
        {notes.map((note) => (
          <div
            key={note.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              marginBottom: 8,
            }}
          >
            <List
              size={13}
              strokeWidth={1.5}
              aria-hidden
              style={{ color: "var(--text-low-content)", flexShrink: 0, marginTop: 2 }}
            />
            <span style={{ flex: 1, font: "var(--text-sm)", color: "var(--text-mid)" }}>
              {note.body}
            </span>
            <span
              style={{
                font: "var(--mono-sm)",
                color: "var(--text-low)",
                whiteSpace: "nowrap",
              }}
            >
              {formatNoteTs(note.createdAt)}
            </span>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setEditorOpen((open) => !open)}
          className="hr-add-note"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
            font: "var(--mono-sm)",
            color: "var(--text-low-content)",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <Plus size={13} strokeWidth={1.5} aria-hidden />
          Add note…
        </button>

        {editorOpen ? (
          <textarea
            placeholder="Write a note…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => void commit()}
            disabled={saving}
            autoFocus
            style={{
              display: "block",
              width: "100%",
              marginTop: 10,
              minHeight: 60,
              padding: "10px 12px",
              background: "var(--bg-void)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-control)",
              color: "var(--text-hi)",
              font: "var(--mono-sm)",
              resize: "vertical",
              outline: "none",
              opacity: saving ? 0.6 : 1,
            }}
          />
        ) : null}

        <style href="hr-add-note" precedence="medium">
          {`.hr-add-note:hover { color: var(--phosphor); }`}
        </style>
      </div>
    </div>
  );
}
