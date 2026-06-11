import { describe, expect, it } from "vitest";
import { llmPostingSchema } from "@/lib/validation";

const valid = {
  isJobPosting: true,
  company: "Meridian Labs",
  role: "Senior Full-Stack Engineer",
  location: null,
  companyStage: "YC W25",
  remotePolicy: "remote",
  salaryMin: 160000,
  salaryMax: 195000,
  salaryCurrency: "USD",
  salaryRaw: "$160k-$195k + equity",
  stackTags: ["TypeScript", "Next.js"],
  visaSponsorship: null,
  contact: "jobs@meridianlabs.dev",
};

describe("llmPostingSchema", () => {
  it("accepts a valid payload", () => {
    expect(llmPostingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects extra keys (strict)", () => {
    expect(llmPostingSchema.safeParse({ ...valid, sneaky: 1 }).success).toBe(false);
  });

  it("rejects a bad enum value", () => {
    expect(
      llmPostingSchema.safeParse({ ...valid, remotePolicy: "wfh" }).success,
    ).toBe(false);
  });

  it("rejects negative salaries", () => {
    expect(llmPostingSchema.safeParse({ ...valid, salaryMin: -5 }).success).toBe(false);
  });

  it("rejects implausibly huge salaries", () => {
    expect(
      llmPostingSchema.safeParse({ ...valid, salaryMax: 50_000_000 }).success,
    ).toBe(false);
  });

  it("rejects oversize strings", () => {
    expect(
      llmPostingSchema.safeParse({ ...valid, company: "x".repeat(300) }).success,
    ).toBe(false);
  });

  it("accepts nulls for every nullable field", () => {
    const allNull = {
      isJobPosting: false,
      company: null,
      role: null,
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
    expect(llmPostingSchema.safeParse(allNull).success).toBe(true);
  });

  it("rejects missing fields (nullable, never optional)", () => {
    const { contact: _contact, ...missing } = valid;
    expect(llmPostingSchema.safeParse(missing).success).toBe(false);
  });
});
