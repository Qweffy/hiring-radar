import { describe, expect, it } from "vitest";
import { buildBrowseHref, parseBrowseSearchParams } from "@/lib/browse-params";

describe("parseBrowseSearchParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseBrowseSearchParams({})).toEqual({
      q: "",
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
      remote: ["remote", "hybrid"],
      salaryMin: 150000,
      stack: ["TypeScript", "React"],
      visa: true,
      month: "2026-06",
      page: 3,
      selected: 48357992,
    });
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
});
