import { describe, expect, it } from "vitest";

import {
  isToolName,
  recallMemoryArgs,
  rememberArgs,
  saveFindingArgs,
  searchJobsArgs,
  toolError,
} from "@/lib/agent/tool-schemas";

describe("tool name allow-list", () => {
  it("accepts the seven known tools", () => {
    for (const name of [
      "get_profile",
      "search_jobs",
      "read_posting",
      "compare_to_profile",
      "save_finding",
      "recall_memory",
      "remember",
    ]) {
      expect(isToolName(name)).toBe(true);
    }
  });

  it("rejects anything off the allow-list", () => {
    expect(isToolName("fetch_url")).toBe(false);
    expect(isToolName("send_email")).toBe(false);
    expect(isToolName("__proto__")).toBe(false);
    expect(isToolName("")).toBe(false);
  });
});

describe("searchJobsArgs validation", () => {
  it("accepts a minimal valid query", () => {
    const r = searchJobsArgs.safeParse({ query: "react founding engineer" });
    expect(r.success).toBe(true);
  });

  it("rejects an empty query", () => {
    expect(searchJobsArgs.safeParse({ query: "" }).success).toBe(false);
  });

  it("rejects unknown keys (strict object)", () => {
    const r = searchJobsArgs.safeParse({ query: "x", evil: true });
    expect(r.success).toBe(false);
  });

  it("rejects an out-of-range remote value", () => {
    const r = searchJobsArgs.safeParse({ query: "x", remote: "anywhere" });
    expect(r.success).toBe(false);
  });
});

describe("saveFindingArgs validation", () => {
  it("accepts a well-formed shortlist finding", () => {
    const r = saveFindingArgs.safeParse({
      hnId: 123,
      score: 88,
      reasons: [{ sign: "+", text: "Strong TS + Next.js match" }],
      decision: "shortlist",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a score above 100", () => {
    const r = saveFindingArgs.safeParse({
      hnId: 1,
      score: 150,
      reasons: [{ sign: "+", text: "ok" }],
      decision: "dismiss",
    });
    expect(r.success).toBe(false);
  });

  it("requires at least one reason", () => {
    const r = saveFindingArgs.safeParse({
      hnId: 1,
      score: 50,
      reasons: [],
      decision: "dismiss",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid reason sign", () => {
    const r = saveFindingArgs.safeParse({
      hnId: 1,
      score: 50,
      reasons: [{ sign: "?", text: "x" }],
      decision: "dismiss",
    });
    expect(r.success).toBe(false);
  });
});

describe("recallMemoryArgs validation", () => {
  it("accepts a minimal valid recall", () => {
    const r = recallMemoryArgs.safeParse({ query: "stripe payments role" });
    expect(r.success).toBe(true);
  });

  it("accepts an explicit k within bounds", () => {
    const r = recallMemoryArgs.safeParse({ query: "x", k: 10 });
    expect(r.success).toBe(true);
  });

  it("rejects an empty query", () => {
    expect(recallMemoryArgs.safeParse({ query: "" }).success).toBe(false);
  });

  it("rejects k above the bound", () => {
    const r = recallMemoryArgs.safeParse({ query: "x", k: 11 });
    expect(r.success).toBe(false);
  });

  it("rejects k below the bound", () => {
    const r = recallMemoryArgs.safeParse({ query: "x", k: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects unknown keys (strict object)", () => {
    const r = recallMemoryArgs.safeParse({ query: "x", evil: true });
    expect(r.success).toBe(false);
  });
});

describe("rememberArgs validation", () => {
  it("accepts a well-formed verdict memory", () => {
    const r = rememberArgs.safeParse({
      kind: "verdict",
      text: "Acme — assessed 82, shortlisted: strong TS + remote",
      salience: 0.64,
      postingId: 42,
    });
    expect(r.success).toBe(true);
  });

  it("accepts a null postingId", () => {
    const r = rememberArgs.safeParse({
      kind: "preference",
      text: "User dislikes on-call-heavy roles",
      salience: 0.5,
      postingId: null,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a bad kind enum", () => {
    const r = rememberArgs.safeParse({
      kind: "rumor",
      text: "x",
      salience: 0.5,
      postingId: null,
    });
    expect(r.success).toBe(false);
  });

  it("rejects salience above 1", () => {
    const r = rememberArgs.safeParse({
      kind: "fact",
      text: "x",
      salience: 1.5,
      postingId: null,
    });
    expect(r.success).toBe(false);
  });

  it("rejects salience below 0", () => {
    const r = rememberArgs.safeParse({
      kind: "fact",
      text: "x",
      salience: -0.1,
      postingId: null,
    });
    expect(r.success).toBe(false);
  });

  it("rejects a missing postingId (must be number or null)", () => {
    const r = rememberArgs.safeParse({
      kind: "fact",
      text: "x",
      salience: 0.5,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown keys (strict object)", () => {
    const r = rememberArgs.safeParse({
      kind: "fact",
      text: "x",
      salience: 0.5,
      postingId: null,
      evil: true,
    });
    expect(r.success).toBe(false);
  });
});

describe("toolError", () => {
  it("shapes an error-as-data object", () => {
    const e = toolError("NotFound", "missing", false);
    expect(e).toEqual({
      error: { type: "NotFound", message: "missing", retryable: false },
    });
  });
});
