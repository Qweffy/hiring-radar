"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  addNote,
  moveStage,
  removeEntry,
  runAgentScan,
} from "@/app/(app)/shortlist/actions";
import {
  FilteredEmpty,
  NeverUsedEmpty,
} from "@/components/shortlist/empty-states";
import { EntryCard } from "@/components/shortlist/entry-card";
import { FilterTabs } from "@/components/shortlist/filter-tabs";
import { RemoveConfirm } from "@/components/shortlist/remove-confirm";
import { RunBanner } from "@/components/shortlist/run-banner";
import { ShortlistHeader } from "@/components/shortlist/shortlist-header";
import { ShortlistStyles } from "@/components/shortlist/shortlist-styles";
import {
  activeTabLabel,
  deriveTabs,
  stageMeta,
  type TabId,
} from "@/components/shortlist/view-model";
import { Toast } from "@/components/ui/toast";
import {
  type ShortlistItem,
  type ShortlistNote,
  type ShortlistStage,
} from "@/lib/queries/shortlist";

/** The completed run summary that drives the review banner, if any. */
export interface ReviewBannerData {
  runId: number;
  picks: number;
  relativeTime: string;
}

/** The in-flight run that drives the live banner, if any. */
export interface LiveRunData {
  runId: number;
  postingsScanned: number;
  step: number;
  totalSteps: number;
}

export interface ShortlistViewProps {
  items: ShortlistItem[];
  review: ReviewBannerData | null;
  live: LiveRunData | null;
}

interface StageError {
  entryId: number;
  /** The stage we reverted back to (its label drives the toast copy). */
  revertedStage: ShortlistStage;
}

/**
 * Shortlist pipeline view. Server data is the source of truth on each render;
 * client state layers optimistic stage moves, note additions, removals, and the
 * confirm modal on top. A failed stage move reverts the select with a shake and
 * surfaces a Retry toast — never silently. The header + tabs always render, so a
 * load error (handled by error.tsx) never reads as empty.
 */
export function ShortlistView({ items, review, live }: ShortlistViewProps) {
  const router = useRouter();
  const [scanning, startScan] = useTransition();

  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [kebabId, setKebabId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  // Optimistic overlays keyed by entryId. The server re-render via
  // revalidatePath reconciles these once the action resolves.
  const [stageOverrides, setStageOverrides] = useState<
    Record<number, ShortlistStage>
  >({});
  const [extraNotes, setExtraNotes] = useState<Record<number, ShortlistNote[]>>(
    {},
  );
  const [removedIds, setRemovedIds] = useState<Record<number, true>>({});
  const [shakingId, setShakingId] = useState<number | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);
  const [stageError, setStageError] = useState<StageError | null>(null);

  // Snapshot of the last successful stage per entry — what we revert to.
  const lastGoodStage = useRef<Record<number, ShortlistStage>>({});

  const stageOf = useCallback(
    (item: ShortlistItem): ShortlistStage =>
      stageOverrides[item.entryId] ?? item.stage,
    [stageOverrides],
  );

  const liveItems = useMemo(
    () => items.filter((item) => !removedIds[item.entryId]),
    [items, removedIds],
  );

  const { tabs, trackedCount } = useMemo(() => {
    const withStage = liveItems.map((item) => ({
      ...item,
      stage: stageOf(item),
    }));
    return deriveTabs(withStage);
  }, [liveItems, stageOf]);

  const visible = useMemo(
    () =>
      activeTab === "all"
        ? liveItems
        : liveItems.filter((item) => stageOf(item) === activeTab),
    [liveItems, activeTab, stageOf],
  );

  const neverUsed = liveItems.length === 0;
  const filteredEmpty = !neverUsed && visible.length === 0;

  const selectTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setKebabId(null);
  }, []);

  const onRunScan = useCallback(() => {
    startScan(async () => {
      const result = await runAgentScan();
      if (result.ok) {
        router.push(`/agent/${result.data.runId}`);
      }
    });
  }, [router]);

  const onStageChange = useCallback(
    (item: ShortlistItem, next: ShortlistStage) => {
      const prior = stageOf(item);
      if (next === prior) return;
      lastGoodStage.current[item.entryId] = prior;
      setStageOverrides((current) => ({ ...current, [item.entryId]: next }));
      setStageError(null);

      void moveStage(item.entryId, next).then((result) => {
        if (result.ok) {
          lastGoodStage.current[item.entryId] = next;
          return;
        }
        // Revert with a shake + Retry toast.
        const revertTo = lastGoodStage.current[item.entryId] ?? item.stage;
        setStageOverrides((current) => ({
          ...current,
          [item.entryId]: revertTo,
        }));
        setShakingId(item.entryId);
        window.setTimeout(() => setShakingId(null), 520);
        setStageError({ entryId: item.entryId, revertedStage: revertTo });
      });
    },
    [stageOf],
  );

  const retryStageError = useCallback(() => {
    setStageError(null);
  }, []);

  const onAddNote = useCallback(
    async (item: ShortlistItem, body: string): Promise<boolean> => {
      setSavingNoteId(item.entryId);
      try {
        const result = await addNote(item.entryId, body);
        if (!result.ok) return false;
        setExtraNotes((current) => {
          const existing = current[item.entryId] ?? [];
          return { ...current, [item.entryId]: [result.data.note, ...existing] };
        });
        return true;
      } finally {
        setSavingNoteId(null);
      }
    },
    [],
  );

  const onConfirmRemove = useCallback(() => {
    if (confirmId === null) return;
    const entryId = confirmId;
    setRemoving(true);
    void removeEntry(entryId).then((result) => {
      setRemoving(false);
      if (result.ok) {
        setRemovedIds((current) => ({ ...current, [entryId]: true }));
        setConfirmId(null);
      }
    });
  }, [confirmId]);

  const confirmCompany =
    confirmId !== null
      ? (items.find((item) => item.entryId === confirmId)?.company ??
        "this role")
      : "this role";

  const notesFor = useCallback(
    (item: ShortlistItem): ShortlistNote[] => {
      const extra = extraNotes[item.entryId] ?? [];
      return [...extra, ...item.notes];
    },
    [extraNotes],
  );

  return (
    <div className="absolute inset-0 overflow-auto">
      <ShortlistStyles />
      <div style={{ padding: "26px 28px" }}>
        <ShortlistHeader
          trackedCount={trackedCount}
          scanning={scanning || live !== null}
          onRunScan={onRunScan}
        />

        <FilterTabs tabs={tabs} activeTab={activeTab} onSelect={selectTab} />

        {live !== null ? (
          <RunBanner
            variant="live"
            runId={live.runId}
            postingsScanned={live.postingsScanned}
            step={live.step}
            totalSteps={live.totalSteps}
          />
        ) : review !== null ? (
          <RunBanner
            variant="review"
            runId={review.runId}
            picks={review.picks}
            relativeTime={review.relativeTime}
            onReview={() => selectTab("new")}
          />
        ) : null}

        {neverUsed ? (
          <NeverUsedEmpty scanning={scanning} onRunScan={onRunScan} />
        ) : filteredEmpty ? (
          <FilteredEmpty activeLabel={activeTabLabel(activeTab)} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {visible.map((item) => (
              <EntryCard
                key={item.entryId}
                item={item}
                stage={stageOf(item)}
                shaking={shakingId === item.entryId}
                notes={notesFor(item)}
                kebabOpen={kebabId === item.entryId}
                savingNote={savingNoteId === item.entryId}
                onStageChange={(next) => onStageChange(item, next)}
                onKebabToggle={() =>
                  setKebabId((current) =>
                    current === item.entryId ? null : item.entryId,
                  )
                }
                onKebabClose={() => setKebabId(null)}
                onReassess={onRunScan}
                onRemove={() => {
                  setKebabId(null);
                  setConfirmId(item.entryId);
                }}
                onAddNote={(body) => onAddNote(item, body)}
              />
            ))}
          </div>
        )}
      </div>

      <RemoveConfirm
        open={confirmId !== null}
        company={confirmCompany}
        removing={removing}
        onCancel={() => setConfirmId(null)}
        onConfirm={onConfirmRemove}
      />

      {stageError !== null ? (
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 24,
            zIndex: 400,
          }}
        >
          <Toast
            tone="error"
            title="Couldn't update stage"
            message={`Reverted to ${stageMeta(stageError.revertedStage).label}. The server didn't respond.`}
            action="retry"
            actionLabel="Retry"
            onAction={retryStageError}
            onClose={() => setStageError(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
