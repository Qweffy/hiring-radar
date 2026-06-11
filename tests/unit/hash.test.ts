import { describe, expect, it } from "vitest";
import { contentHash } from "@/lib/hash";

describe("contentHash", () => {
  it("is stable for identical input", () => {
    expect(contentHash("hello <p>world")).toBe(contentHash("hello <p>world"));
  });

  it("changes on any edit", () => {
    expect(contentHash("salary: $160k")).not.toBe(contentHash("salary: $165k"));
  });

  it("is whitespace-sensitive", () => {
    expect(contentHash("a b")).not.toBe(contentHash("a  b"));
  });

  it("returns 64 hex chars", () => {
    expect(contentHash("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});
