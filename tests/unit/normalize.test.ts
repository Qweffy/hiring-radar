import { describe, expect, it } from "vitest";
import { normalizePosting } from "@/lib/llm/normalize";
import type { LlmPosting } from "@/lib/validation";

const base: LlmPosting = {
  isJobPosting: true,
  company: "Acme",
  role: "Engineer",
  location: null,
  companyStage: null,
  remotePolicy: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryRaw: null,
  stackTags: [],
  visaSponsorship: null,
  contact: null,
};

describe("normalizePosting", () => {
  it("applies the salary-k heuristic only below 1000", () => {
    expect(normalizePosting({ ...base, salaryMin: 160, salaryMax: 195 })).toMatchObject({
      salaryMin: 160000,
      salaryMax: 195000,
    });
    expect(
      normalizePosting({ ...base, salaryMin: 160000, salaryMax: 195000 }),
    ).toMatchObject({ salaryMin: 160000, salaryMax: 195000 });
  });

  it("swaps inverted min/max", () => {
    expect(
      normalizePosting({ ...base, salaryMin: 195000, salaryMax: 160000 }),
    ).toMatchObject({ salaryMin: 160000, salaryMax: 195000 });
  });

  it("uppercases valid currencies and nulls invalid ones", () => {
    expect(normalizePosting({ ...base, salaryCurrency: "usd" }).salaryCurrency).toBe("USD");
    expect(normalizePosting({ ...base, salaryCurrency: "dollars" as never }).salaryCurrency).toBeNull();
  });

  it("trims, dedupes case-insensitively and caps stack tags at 8", () => {
    const tags = [
      " TypeScript ",
      "typescript",
      "React",
      "Go",
      "Rust",
      "Python",
      "Postgres",
      "Redis",
      "Kafka",
      "AWS",
    ];
    const out = normalizePosting({ ...base, stackTags: tags }).stackTags;
    expect(out).toHaveLength(8);
    expect(out[0]).toBe("TypeScript");
    expect(out.filter((t) => t.toLowerCase() === "typescript")).toHaveLength(1);
  });

  it("collapses whitespace and nulls empty strings", () => {
    expect(
      normalizePosting({ ...base, company: "  Acme   Corp  ", role: "   " }),
    ).toMatchObject({ company: "Acme Corp", role: null });
  });
});
