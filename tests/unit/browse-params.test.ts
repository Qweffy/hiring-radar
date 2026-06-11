import { describe, expect, it } from "vitest";
import { buildBrowseHref, parseBrowseSearchParams } from "@/lib/browse-params";

describe("parseBrowseSearchParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseBrowseSearchParams({})).toEqual({
      q: "",
      mode: "exact", // no query → exact, regardless of ?mode
      remote: [],
      salaryMin: null,
      stack: [],
      visa: false,
      month: null,
      page: 1,
      selected: null,
    });
  });

  it("parses csv params and coerces numbers", () => {
    const f = parseBrowseSearchParams({
      q: "typescript",
      remote: "remote,hybrid",
      stack: "TypeScript,React",
      salaryMin: "150000",
      visa: "1",
      month: "2026-06",
      page: "3",
      selected: "48357992",
    });
    expect(f).toEqual({
      q: "typescript",
      mode: "hybrid", // default mode when a query is present
      remote: ["remote", "hybrid"],
      salaryMin: 150000,
      stack: ["TypeScript", "React"],
      visa: true,
      month: "2026-06",
      page: 3,
      selected: 48357992,
    });
  });

  it("parses the mode param when a query is present", () => {
    expect(parseBrowseSearchParams({ q: "rust", mode: "semantic" }).mode).toBe(
      "semantic",
    );
    expect(parseBrowseSearchParams({ q: "rust", mode: "exact" }).mode).toBe(
      "exact",
    );
    // garbage mode → default hybrid (query present)
    expect(parseBrowseSearchParams({ q: "rust", mode: "telepathy" }).mode).toBe(
      "hybrid",
    );
    // mode is ignored without a query → forced exact
    expect(parseBrowseSearchParams({ mode: "semantic" }).mode).toBe("exact");
  });

  it("never throws on garbage — falls back to defaults", () => {
    const f = parseBrowseSearchParams({
      remote: "wfh,remote,;DROP TABLE",
      salaryMin: "lots",
      month: "junio",
      page: "-4",
      selected: "abc",
    });
    expect(f.remote).toEqual(["remote"]);
    expect(f.salaryMin).toBeNull();
    expect(f.month).toBeNull();
    expect(f.page).toBe(1);
    expect(f.selected).toBeNull();
  });

  it("takes the first value of repeated params", () => {
    expect(parseBrowseSearchParams({ q: ["a", "b"] }).q).toBe("a");
  });
});

describe("buildBrowseHref", () => {
  it("omits defaults", () => {
    expect(buildBrowseHref({})).toBe("/browse");
    expect(buildBrowseHref({ page: 1, q: "" })).toBe("/browse");
  });

  it("round-trips with the parser", () => {
    const f = parseBrowseSearchParams({
      q: "rust",
      remote: "remote",
      salaryMin: "120000",
      page: "2",
    });
    const href = buildBrowseHref(f);
    expect(href).toContain("q=rust");
    expect(href).toContain("remote=remote");
    expect(href).toContain("salaryMin=120000");
    expect(href).toContain("page=2");
  });

  it("omits the default mode but emits non-default modes", () => {
    // hybrid is the default — never in the URL.
    expect(buildBrowseHref({ q: "rust", mode: "hybrid" })).not.toContain("mode=");
    expect(buildBrowseHref({ q: "rust", mode: "semantic" })).toContain(
      "mode=semantic",
    );
    expect(buildBrowseHref({ q: "rust", mode: "exact" })).toContain("mode=exact");
    // mode is meaningless without a query — never emitted.
    expect(buildBrowseHref({ mode: "semantic" })).toBe("/browse");
  });
});
