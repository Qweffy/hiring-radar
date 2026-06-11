# Next.js App Router Data Patterns — Best Practices
> Researched 2026-06-10. Sources verified against current official docs (nextjs.org, v16.2.9).

## TL;DR
- Read in Server Components: query Drizzle directly in `page.tsx`; guard the data layer with `import 'server-only'`; dedupe per-request with `React.cache`.
- Write only via Server Actions in `'use server'` files; validate with zod inside the action; auth-check every action — they are publicly reachable POST endpoints.
- Expected failures are return values (`{ ok: false, error }`) consumed by `useActionState`; thrown errors are for bugs and land in `error.tsx`.
- Next 16 caches nothing by default. Enable `cacheComponents: true`; cache reads with `'use cache'` + `cacheTag` + `cacheLife`; invalidate with `updateTag` (Server Actions) or `revalidateTag(tag, 'max')` (Route Handlers, e.g. Inngest-triggered ingestion).
- Prefer tag-based invalidation over `revalidatePath` — paths over-invalidate (official guidance).
- Stream with `<Suspense>` around slow work (pgvector search, agent calls); `loading.tsx` covers only `page.tsx`; never read uncached data in layouts.

## Practices
**Query the DB directly in Server Components.** `await db.select().from(postings)` in an async page/RSC is the official pattern — credentials and query logic never reach the client bundle. Put queries in `lib/db/queries.ts` with `import 'server-only'` (package: `server-only`) so a client import fails at build time. https://nextjs.org/docs/app/getting-started/fetching-data

**Dedupe and parallelise reads.** Wrap shared read functions in `React.cache()` — memoised per request, so layout + page can call the same query once. Sequential `await`s serialise; start promises first, then `Promise.all` (or `Promise.allSettled` when partial failure is acceptable). https://nextjs.org/docs/app/getting-started/fetching-data#parallel-data-fetching

**One typed result contract for every action.** Define once and reuse:
```ts
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
```
With `useActionState`, the action signature is `(prevState: ActionResult<T> | null, formData: FormData)`. Validate with `schema.safeParse(...)`; on failure return `{ ok: false, error: 'Invalid input', fieldErrors: z.flattenError(result.error).fieldErrors }`. Every code path — including the catch — returns the same shape; never throw for expected failures. Official docs: "avoid using try/catch blocks and throw errors. Instead, model expected errors as return values." https://nextjs.org/docs/app/getting-started/error-handling#server-functions

**Auth inside every action.** Server Actions are POST endpoints reachable outside your UI. Verify session/authorisation at the top of each action body, not in the form component. Same applies to ownership checks before deletes. https://nextjs.org/docs/app/getting-started/mutating-data

**Enable Cache Components; cache reads explicitly.** Set `cacheComponents: true` in `next.config.ts` (the intended path for new Next 16 projects). Then:
```ts
export async function getPostings(month: string) {
  'use cache'
  cacheLife('max')
  cacheTag(`postings-${month}`)
  return db.select()...
}
```
Drizzle queries are never auto-cached — without `'use cache'` everything is dynamic per request. Monthly HN postings are ideal `'max'` + tag candidates; leave live/AI endpoints uncached. https://nextjs.org/docs/app/getting-started/revalidating

**Invalidation matrix (Next 16).**
| API | Where | Semantics | hiring-radar use |
|---|---|---|---|
| `updateTag(tag)` | Server Actions only | Expire + refresh same request (read-your-writes) | user-facing mutations |
| `revalidateTag(tag, 'max')` | Actions + Route Handlers | Stale-while-revalidate | after Inngest ingestion completes (runs via Route Handler — `updateTag` is unavailable there) |
| `refresh()` | Server Actions only | Refresh uncached data, cache untouched | live counters |
| `revalidatePath(path)` | Actions + Route Handlers | Nukes whole route | fallback only; prefer tags |
https://nextjs.org/docs/app/getting-started/revalidating · https://nextjs.org/blog/next-16

**`redirect()` after mutation, outside try/catch.** `redirect()` and `notFound()` throw framework control-flow exceptions; call them after `updateTag`/`revalidateTag`, and never inside a `try` block that catches and returns `{ ok: false }` — you'd swallow the redirect. https://nextjs.org/docs/app/getting-started/mutating-data#redirect-after-a-mutation

**Stream at the boundary that's slow.** `loading.tsx` wraps the whole page in Suspense; use granular `<Suspense fallback={<Skeleton/>}>` around the hybrid-search results component instead, so filters/header paint instantly. To stream into Client Components, pass the un-awaited promise as a prop and resolve with React's `use()`. https://nextjs.org/docs/app/getting-started/fetching-data#streaming

**Route-level error boundaries.** `error.tsx` per segment (`'use client'`), `global-error.tsx` for the root (must render `<html>/<body>`). As of 16.2 the recovery prop is `unstable_retry()` (re-fetches + re-renders); `reset()` only re-renders without re-fetching. In production, server-thrown error messages are replaced by a generic message + `error.digest` — log the digest server-side; anything the user must read goes through the action's typed return instead. Use `notFound()` + `not-found.tsx` for missing entities. https://nextjs.org/docs/app/api-reference/file-conventions/error

## Pitfalls
- **Old caching mental model.** Tutorials pre-Next 15 assume `fetch` (and pages) are cached by default. In 15/16 nothing is. `unstable_cache`, `export const revalidate`, `experimental.ppr`, and `dynamicIO` are all superseded by `'use cache'` + `cacheLife`/`cacheTag`.
- **`useFormState` from `react-dom`** is the deprecated predecessor — use `useActionState` from `react`.
- **Sync dynamic APIs removed in 16:** `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` must all be awaited (`params: Promise<{ slug: string }>`).
- **Single-argument `revalidateTag(tag)` is deprecated** — pass a `cacheLife` profile (`'max'` recommended) or use `updateTag` in actions. `updateTag` does not work in Route Handlers.
- **Throwing zod errors from actions** gives users a useless sanitised digest message in production. Return field errors; throw only for genuinely unexpected states.
- **try/catch swallowing `redirect()`** — classic bug when wrapping the whole action body; keep `redirect` after the catch or rethrow control-flow errors.
- **Uncached reads in `layout.tsx`** block navigation: `loading.tsx` does not cover the layout above it. Cache Components turns this into a build error; fix with Suspense or move reads into the page.
- **Error boundaries don't catch event-handler errors** — actions invoked from `onClick` need their own try/catch + state (or `startTransition`, whose errors do bubble to the boundary).
- **Server Actions run serially on the client** — never use them as a parallel data-fetching mechanism; fetch in RSCs or a Route Handler.
- **`middleware.ts` is deprecated** — rename to `proxy.ts` (Node.js runtime, exported `proxy` function).
- **Parallel route slots require explicit `default.tsx` in 16** — builds fail without them.

## Version notes
- Current as of June 2026: `next@16.2.9`, `react@19.2.4`, `react-dom@19.2.4` (already installed). Requires Node ≥20.9, TypeScript ≥5.1. Docs version: 16.2.9.
- Next 16 (Oct 2025): Turbopack default bundler; `next lint` removed (run `eslint` directly — this repo already does); `cacheComponents` config is stable and replaces `experimental.ppr`/`experimental.dynamicIO`; new `updateTag()`/`refresh()`; `revalidateTag` two-arg signature. https://nextjs.org/blog/next-16 · https://nextjs.org/docs/app/guides/upgrading/version-16
- 16.2.0 added the `unstable_retry` prop to `error.tsx`/`global-error.tsx` (prefer it over `reset`).
- Install for this topic: `zod@^4` (4.4.x current; use top-level `z.flattenError(err)` — `error.flatten()` is deprecated in v4) and `server-only`. Hand-rolled `ActionResult` is fine at this scale; if action boilerplate grows, `next-safe-action` (v8+, Standard Schema — works with zod 4) is the community-standard wrapper. https://next-safe-action.dev/
```

## Verification
- Markdown only; no checks to run. Self-reviewed: every practice cites a v16.2.9 official doc page fetched today; the injected `unstable_instant` "hint" was excluded.
