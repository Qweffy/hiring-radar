"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildBrowseHref,
  DEFAULT_SEARCH_MODE,
  type BrowseFilters,
} from "@/lib/browse-params";
import type {
  BrowseResult,
  PostingDetail,
  PostingRow,
} from "@/lib/queries/postings";
import { BrowseToolbar } from "@/components/browse/browse-toolbar";
import { PostingTable } from "@/components/browse/posting-table";
import { PostingDetailDrawer } from "@/components/browse/posting-detail-drawer";

export interface BrowseViewProps {
  filters: BrowseFilters;
  result: BrowseResult;
  detail: PostingDetail | null;
  /** Server timestamp (epoch ms) — keeps relative times hydration-stable. */
  now: number;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || target.isContentEditable
  );
};

/**
 * Browse — "the index". The URL is the single source of truth: every filter
 * edit replaces the URL inside a transition; the list dims while pending and
 * never blanks.
 */
export function BrowseView({ filters, result, detail, now }: BrowseViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Latest props in refs so URL-building callbacks stay referentially stable
  // (the Drawer's focus trap re-runs when onClose changes identity).
  const filtersRef = useRef(filters);
  const rowsRef = useRef<PostingRow[]>(result.rows);
  const selectedRef = useRef(filters.selected);

  const replaceWith = useCallback(
    (next: BrowseFilters) => {
      startTransition(() => {
        router.replace(buildBrowseHref(next), { scroll: false });
      });
    },
    [router],
  );

  /** Filter edits — reset to page 1, keep the drawer selection. */
  const applyFilters = useCallback(
    (patch: Partial<BrowseFilters>) => {
      replaceWith({ ...filtersRef.current, ...patch, page: 1 });
    },
    [replaceWith],
  );

  const clearFilters = useCallback(() => {
    replaceWith({
      ...filtersRef.current,
      q: "",
      mode: DEFAULT_SEARCH_MODE,
      remote: [],
      salaryMin: null,
      stack: [],
      visa: false,
      month: null,
      page: 1,
    });
  }, [replaceWith]);

  const goToPage = useCallback(
    (page: number) => {
      replaceWith({ ...filtersRef.current, page });
    },
    [replaceWith],
  );

  const openPosting = useCallback(
    (hnId: number) => {
      startTransition(() => {
        router.push(
          buildBrowseHref({ ...filtersRef.current, selected: hnId }),
          { scroll: false },
        );
      });
    },
    [router],
  );

  /** Drawer prev/next — replace, so arrowing through rows doesn't pile history. */
  const navigateToPosting = useCallback(
    (hnId: number) => {
      replaceWith({ ...filtersRef.current, selected: hnId });
    },
    [replaceWith],
  );

  const closeDrawer = useCallback(() => {
    replaceWith({ ...filtersRef.current, selected: null });
  }, [replaceWith]);

  // Keyboard cursor over the visible rows (j/k + Enter). -1 = no cursor yet.
  const [cursor, setCursor] = useState(-1);
  const effectiveCursor = Math.min(cursor, result.rows.length - 1);
  const cursorRef = useRef(effectiveCursor);

  // Sync the "latest value" refs after every render (never during render).
  useEffect(() => {
    filtersRef.current = filters;
    rowsRef.current = result.rows;
    selectedRef.current = filters.selected;
    cursorRef.current = effectiveCursor;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const rows = rowsRef.current;
      if (rows.length === 0) return;
      const selected = selectedRef.current;

      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        const delta = event.key === "j" ? 1 : -1;
        if (selected !== null) {
          // Drawer open — j/k walk the current page rows.
          const index = rows.findIndex((r) => r.hnId === selected);
          if (index === -1) return;
          const next = index + delta;
          if (next < 0 || next >= rows.length) return;
          navigateToPosting(rows[next].hnId);
          return;
        }
        setCursor((c) => {
          const clamped = Math.min(c, rows.length - 1);
          return Math.max(0, Math.min(rows.length - 1, clamped + delta));
        });
        return;
      }

      if (event.key === "Enter" && selected === null) {
        const c = cursorRef.current;
        if (c < 0 || c >= rows.length) return;
        event.preventDefault();
        openPosting(rows[c].hnId);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigateToPosting, openPosting]);

  const hasActiveFilters =
    filters.q.length > 0 ||
    filters.remote.length > 0 ||
    filters.salaryMin !== null ||
    filters.stack.length > 0 ||
    filters.visa ||
    filters.month !== null;

  return (
    <div className="absolute inset-0 flex flex-col">
      <BrowseToolbar
        filters={filters}
        result={result}
        isPending={isPending}
        onPatch={applyFilters}
        onClearAll={clearFilters}
      />
      <PostingTable
        rows={result.rows}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        month={result.month}
        cursor={effectiveCursor}
        selectedHnId={filters.selected}
        isPending={isPending}
        hasActiveFilters={hasActiveFilters}
        filters={filters}
        now={now}
        onOpen={(hnId, index) => {
          setCursor(index);
          openPosting(hnId);
        }}
        onPageChange={goToPage}
        onClearFilters={clearFilters}
      />
      {filters.selected !== null ? (
        <PostingDetailDrawer
          detail={detail}
          selectedHnId={filters.selected}
          rows={result.rows}
          now={now}
          onClose={closeDrawer}
          onNavigate={navigateToPosting}
        />
      ) : null}
    </div>
  );
}
