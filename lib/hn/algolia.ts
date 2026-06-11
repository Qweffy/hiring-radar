import { hnThreadSchema, type HnComment } from "@/lib/validation";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";
const USER_AGENT = "hiring-radar/0.1 (github.com/Qweffy/hiring-radar)";

export type LivePosting = HnComment & { author: string; text: string };

export type ThreadFetch = {
  threadId: number;
  title: string | null;
  /** Top-level live comments with author+text — the job postings. */
  postings: LivePosting[];
};

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
