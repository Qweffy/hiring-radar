import { z } from "zod";

import { hnThreadSchema, type HnComment } from "@/lib/validation";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";
const USER_AGENT = "hiring-radar/0.1 (github.com/Qweffy/hiring-radar)";

export type LivePosting = HnComment & { author: string; text: string };

export interface ThreadFetch {
  threadId: number;
  title: string | null;
  /** Top-level live comments with author+text — the job postings. */
  postings: LivePosting[];
}

/**
 * One request returns the full nested comment tree. Algolia silently
 * omits deleted/dead comments, so deletion detection is an ID diff
 * against what we have stored (done by the caller).
 */
export async function fetchThread(threadId: number): Promise<ThreadFetch> {
  const res = await fetch(`${ALGOLIA_BASE}/items/${threadId}`, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Algolia items/${threadId} responded HTTP ${res.status}`);
  }
  const thread = hnThreadSchema.parse(await res.json());

  const postings = thread.children.filter(
    (c): c is LivePosting =>
      c.type === "comment" &&
      c.author !== null &&
      c.text !== null &&
      c.text.trim().length > 0,
  );

  return { threadId: thread.id, title: thread.title, postings };
}

/* ------------------------------------------------------------------ */
/* Latest "Who is hiring?" thread discovery (drives the monthly cron)   */
/* ------------------------------------------------------------------ */

const searchHitSchema = z.looseObject({
  objectID: z.string(),
  title: z.string().nullable().catch(null),
  created_at: z.string(),
});

const searchResponseSchema = z.looseObject({
  hits: z.array(searchHitSchema),
});

export interface HiringThread {
  threadId: number;
  title: string;
  /** Posting month derived from the thread title or its creation date. */
  month: string;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "Ask HN: Who is hiring? (June 2026)" → "2026-06"; falls back to created_at. */
function monthFromThread(title: string, createdAt: string): string {
  const m = /\(([a-z]+)\s+(\d{4})\)/.exec(title.toLowerCase());
  if (m) {
    const idx = MONTHS.indexOf(m[1]);
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, "0")}`;
  }
  return createdAt.slice(0, 7);
}

/**
 * Find the most recent "Ask HN: Who is hiring?" thread. The whoishiring account
 * posts three monthly threads (hiring / wants to be hired / freelancer); we
 * filter to the hiring thread by title prefix. search_by_date returns
 * newest-first, so the first matching hit is the current month's thread.
 * Returns null when no matching story is found.
 */
export async function findLatestHiringThread(): Promise<HiringThread | null> {
  const url =
    `${ALGOLIA_BASE}/search_by_date` +
    `?tags=story,author_whoishiring` +
    `&hitsPerPage=10`;
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Algolia search_by_date responded HTTP ${res.status}`);
  }
  const { hits } = searchResponseSchema.parse(await res.json());

  const match = hits.find(
    (h) => h.title !== null && /^ask hn:\s*who is hiring\?/i.test(h.title),
  );
  if (match?.title == null) return null;

  return {
    threadId: Number(match.objectID),
    title: match.title,
    month: monthFromThread(match.title, match.created_at),
  };
}
