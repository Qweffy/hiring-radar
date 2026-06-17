import  { type LlmPosting } from "@/lib/validation";

const collapse = (s: string | null): string | null => {
  if (s === null) return null;
  const out = s.replace(/\s+/g, " ").trim();
  return out.length > 0 ? out : null;
};

/**
 * Pure post-processing of schema-valid LLM output. Constrained decoding
 * guarantees shape; this fixes the semantic slips a model still makes.
 */
export function normalizePosting(p: LlmPosting): LlmPosting {
  let salaryMin = p.salaryMin;
  let salaryMax = p.salaryMax;

  // "160" almost always means 160k for annual salaries.
  const kFix = (n: number | null): number | null =>
    n !== null && n > 0 && n < 1000 ? n * 1000 : n;
  salaryMin = kFix(salaryMin);
  salaryMax = kFix(salaryMax);

  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    [salaryMin, salaryMax] = [salaryMax, salaryMin];
  }

  const currency =
    p.salaryCurrency !== null && /^[A-Za-z]{3}$/.test(p.salaryCurrency)
      ? p.salaryCurrency.toUpperCase()
      : null;

  const seen = new Set<string>();
  const stackTags = p.stackTags
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => {
      if (t.length === 0) return false;
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  return {
    ...p,
    company: collapse(p.company),
    role: collapse(p.role),
    location: collapse(p.location),
    companyStage: collapse(p.companyStage),
    salaryMin,
    salaryMax,
    salaryCurrency: currency,
    salaryRaw: collapse(p.salaryRaw),
    stackTags,
    contact: collapse(p.contact),
  };
}
