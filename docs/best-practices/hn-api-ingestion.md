# Hacker News API ingestion — Best Practices
> Researched 2026-06-10. Sources verified against current official docs and live API responses.

## TL;DR
- Fetch each "Who is hiring" thread with one request: `GET https://hn.algolia.com/api/v1/items/:id` returns the full nested comment tree — no pagination, no per-comment fetches.
- Discover threads with `search_by_date?tags=story,author_whoishiring` and match the title prefix `Ask HN: Who is hiring?`. Never hardcode the posting date — it lands at 11:00 US/Eastern on the first weekday (UTC hour shifts with DST).
- Algolia silently omits deleted and dead comments from the tree. Detect deletions by diffing stored comment IDs against the latest tree; confirm individual cases via Firebase `deleted`/`dead` flags.
- Neither API exposes an edit timestamp. Store `sha256(raw text)` per comment; re-run the Groq parse and re-embed only when the hash changes.
- Limits: Algolia is 10,000 req/h per IP; Firebase officially has no rate limit. A full monthly ingest costs ~2 Algolia requests — stay nowhere near the cap.
- The `algolia/hn-search` repo was archived Feb 2026 and the index has had ingestion outages. Cross-check comment counts against Firebase `descendants` and keep a Firebase recursive fallback.

## Practices

**Use Algolia `items/:id` as the primary thread fetch.** `GET https://hn.algolia.com/api/v1/items/48357725` returns the story plus every live comment as a recursive `children` array (verified live: June 2026 thread, 311 top-level children, 462 comments, one request). The Firebase equivalent requires one request per item (~470 requests for the same thread). Each node carries `id`, `author`, `text` (HTML), `created_at`, `created_at_i`, `parent_id`, `story_id`, `children`. Source: https://hn.algolia.com/api

**Discover the monthly thread by author, then filter by title.** `GET https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=10` returns the `whoishiring` account's submissions newest-first. The account posts 2–3 threads per month ("Who is hiring?", "Who wants to be hired?", "Freelancer? Seeking freelancer?"), so match `title.startsWith('Ask HN: Who is hiring?')` — order within the batch is not guaranteed. Fallback: Firebase `GET /v0/user/whoishiring.json` → `submitted` array (newest first), but that needs per-item fetches to read titles. Sources: https://hn.algolia.com/api, https://github.com/HackerNews/API

**Schedule discovery as a poll, not a fixed timestamp.** Threads post at 11:00 US/Eastern on the first weekday of the month — observed `2026-06-01T15:00:48Z` but `2026-03-02T16:00:27Z` and `2025-11-03T16:00:00Z` (DST shift + weekend skip). In Inngest: cron a discovery run every few hours on days 1–3, idempotent on the story ID.

**Detect deletions by ID diff, not by flags.** The Algolia tree contains only live comments: deleted and dead items vanish entirely (verified: Firebase listed 349 top-level `kids`, Algolia returned 311; every missing ID resolved to `"deleted": true` via Firebase). Pattern: after each crawl, `storedIds − fetchedIds` = comments to soft-delete (keep the row, mark `deleted_at`, drop from search index). To distinguish deleted vs dead (flagged) for individual IDs, fetch `https://hacker-news.firebaseio.com/v0/item/<id>.json` and read `deleted` / `dead`. Source: https://github.com/HackerNews/API

**Detect edits with a content hash.** No edit timestamp exists in either API (Algolia search hits have `updated_at`, but it is the index-record reindex time — it also moves on vote/reply changes; do not trust it as an edit signal). Store `content_hash = sha256(comment.text)` computed from the raw HTML string. On re-crawl, upsert only rows whose hash changed, and gate the expensive work (Groq parse, embedding) behind that comparison. Always hash text from the same source API — Algolia and Firebase may differ in HTML entity encoding, so mixing sources causes false-positive "edits".

**Re-crawl the whole tree, cheaply.** Because one `items/:id` call returns everything, the simplest correct sync is: refetch full tree on a schedule (e.g. every 6–12 h for the thread's first 2–3 weeks), hash-diff all comments, ID-diff for deletions. Skip incremental `numericFilters=created_at_i>X` tricks for the main loop — they catch new comments but miss edits and deletions. HN's user edit window is short (~2 h, undocumented), but moderator deletions occur throughout the month (observed deleted comments dated across the full month).

**Validate freshness against Firebase before trusting a crawl.** One `GET /v0/item/<threadId>.json` gives `descendants` (471 for June 2026; includes deleted, so expect `fetched ≤ descendants`). If `descendants − fetchedCount` is implausibly large or the Algolia tree hasn't grown while the thread is active, the index is lagging (it halted entirely in Feb 2026) — fall back to recursive Firebase fetching of `kids` with bounded concurrency (~20 parallel; the API states "there is currently no rate limit"). Sources: https://github.com/HackerNews/API, https://news.ycombinator.com/item?id=47115009

**Treat only top-level comments as job postings.** Replies are discussion/questions, not postings. Filter `parent_id === story_id` (Algolia) / direct `kids` of the story (Firebase) before sending anything to the LLM parser.

**Be a polite client.** Set a descriptive `User-Agent` (e.g. `hiring-radar/1.0 (github.com/Qweffy)`), honour the Algolia 10,000 req/h-per-IP limit, back off exponentially on 429/5xx, and cache responses during development. Source: https://hn.algolia.com/api

## Pitfalls
- **The 1000-hit pagination wall.** Algolia search (`tags=comment,story_X` + `page`) silently caps at 1000 total hits regardless of `hitsPerPage`/`page` (`paginationLimitedTo`; undocumented on the HN page, confirmed in https://github.com/algolia/hn-search/issues/230 — still open, repo archived, will not be fixed). Old tutorials that loop `page` until `nbPages` truncate large threads (2021–22 hiring threads exceeded 1000 comments). The `items/:id` tree endpoint has no such cap — use it.
- **Count mismatches are normal.** `num_comments`/`descendants` count deleted comments; the Algolia tree excludes them; the Algolia search index lags deletions (observed `nbHits=471` in search vs 462 in the live tree on the same day). Never use strict equality as an ingest assertion.
- **`updated_at` on search hits is not an edit timestamp** — it's the reindex time. Hash content instead.
- **Recursive Firebase fetching as the default** (the pattern in most pre-2020 tutorials) costs ~500 sequential requests per thread. Keep it only as the fallback path, parallelised.
- **`text` is HTML, not plain text** (`<p>`, `&#x27;`, `<a href>` …). Hash the raw HTML; decode/sanitise separately before LLM parsing and embedding. The thread can contain hostile content — treat every comment as untrusted input to the prompt-injection defences.
- **Hardcoding "1st of the month, 15:00 UTC"** misses DST months (16:00Z) and weekend-skip months (posted on the 2nd or 3rd).
- **`points` is `null` on comments** in the items tree — don't rely on comment scores for ranking.

## Version notes (June 2026)
- **Algolia HN API**: `https://hn.algolia.com/api/v1` — current, no auth/API key, 10,000 req/h per IP. The backing GitHub repo `algolia/hn-search` was **archived on 2026-02-10** (read-only) after a mid-February ingestion outage; the service is operational (status: https://hn.hund.io/) but maintenance-only — design for index lag/outage with the Firebase fallback.
- **Official HN API**: `https://hacker-news.firebaseio.com/v0` — current, stable for ~a decade, no rate limit, no breaking changes announced. Plain REST `.json` GETs; do **not** install the `firebase` SDK for this.
- **Packages to install: none.** Native `fetch` (Node 20+/Next.js) covers both APIs. Skip `algoliasearch` (the HN endpoint is a public REST proxy, not a credentialed Algolia app) and unmaintained wrappers (`node-hn-api`, `hacker-news-api`). Validate responses at the boundary with `zod` (already standard in this stack).
```
