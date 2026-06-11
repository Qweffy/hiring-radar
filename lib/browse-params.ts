import { z } from "zod";

export const REMOTE_VALUES = ["remote", "hybrid", "onsite"] as const;
export type RemoteValue = (typeof REMOTE_VALUES)[number];

export const SEARCH_MODES = ["exact", "semantic", "hybrid"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

/** Default mode for a non-empty query — semantic exists now, hybrid fuses both. */
export const DEFAULT_SEARCH_MODE: SearchMode = "hybrid";

export type BrowseFilters = {
  q: string;
  mode: SearchMode;
  remote: RemoteValue[];
  salaryMin: number | null;
  stack: string[];
  visa: boolean;
  month: string | null; // null → latest available month
  page: number;
  selected: number | null; // hnId of the posting open in the drawer
};

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const csv = (v: string | undefined): string[] =>
  v ? v.split(",").map((s) => s.trim()).filter((s) => s.length > 0) : [];

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/).catch("");
const modeSchema = z.enum(SEARCH_MODES).catch(DEFAULT_SEARCH_MODE);
const pageSchema = z.coerce.number().int().min(1).max(10_000).catch(1);
const salarySchema = z.coerce.number().int().min(0).max(5_000_000).catch(0);
const hnIdSchema = z.coerce.number().int().positive().catch(0);

/**
 * Every value comes from the URL — untrusted. Garbage falls back to
 * defaults; this function never throws.
 */
export function parseBrowseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): BrowseFilters {
  const month = monthSchema.parse(first(raw.month) ?? "");
  const salary = salarySchema.parse(first(raw.salaryMin) ?? 0);
  const selected = hnIdSchema.parse(first(raw.selected) ?? 0);

  const remote = csv(first(raw.remote)).filter((v): v is RemoteValue =>
    (REMOTE_VALUES as readonly string[]).includes(v),
  );

  const q = (first(raw.q) ?? "").trim().slice(0, 200);
  // No query → nothing to embed; EXACT is the only meaningful (and default) mode.
  const mode = q.length > 0 ? modeSchema.parse(first(raw.mode) ?? "") : "exact";

  return {
    q,
    mode,
    remote,
    salaryMin: salary > 0 ? salary : null,
    stack: csv(first(raw.stack)).slice(0, 10).map((s) => s.slice(0, 40)),
    visa: first(raw.visa) === "1",
    month: month.length > 0 ? month : null,
    page: pageSchema.parse(first(raw.page) ?? 1),
    selected: selected > 0 ? selected : null,
  };
}

/** Build a /browse href from filters, omitting defaults to keep URLs clean. */
export function buildBrowseHref(f: Partial<BrowseFilters>): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  // mode only matters with a query, and we keep the default out of the URL.
  if (f.q && f.mode && f.mode !== DEFAULT_SEARCH_MODE) params.set("mode", f.mode);
  if (f.remote && f.remote.length > 0) params.set("remote", f.remote.join(","));
  if (f.salaryMin) params.set("salaryMin", String(f.salaryMin));
  if (f.stack && f.stack.length > 0) params.set("stack", f.stack.join(","));
  if (f.visa) params.set("visa", "1");
  if (f.month) params.set("month", f.month);
  if (f.page && f.page > 1) params.set("page", String(f.page));
  if (f.selected) params.set("selected", String(f.selected));
  const qs = params.toString();
  return qs.length > 0 ? `/browse?${qs}` : "/browse";
}
