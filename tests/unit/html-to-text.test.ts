import { describe, expect, it } from "vitest";
import { hnHtmlToText } from "@/lib/hn/html-to-text";

describe("hnHtmlToText", () => {
  it("turns <p> into blank-line paragraphs", () => {
    expect(hnHtmlToText("First line.<p>Second paragraph.")).toBe(
      "First line.\n\nSecond paragraph.",
    );
  });

  it("decodes common and numeric entities", () => {
    expect(hnHtmlToText("we&#x27;re hiring &amp; growing &gt; fast &#8212; now")).toBe(
      "we're hiring & growing > fast — now",
    );
  });

  it("keeps link labels, swaps truncated labels for the href", () => {
    expect(
      hnHtmlToText('apply at <a href="https://x.dev/jobs" rel="nofollow">our site</a>'),
    ).toBe("apply at our site");
    expect(
      hnHtmlToText('<a href="https://example.com/careers/senior-engineer">https:&#x2F;&#x2F;example.com&#x2F;car...</a>'),
    ).toBe("https://example.com/careers/senior-engineer");
  });

  it("preserves code blocks verbatim", () => {
    const html = "Stack:<p><pre><code>  TypeScript\n  Postgres &amp; Redis</code></pre><p>Apply now";
    const out = hnHtmlToText(html);
    expect(out).toContain("  TypeScript\n  Postgres & Redis");
    expect(out).toContain("Apply now");
  });

  it("strips inline formatting tags", () => {
    expect(hnHtmlToText("<i>Remote</i> <b>only</b>")).toBe("Remote only");
  });

  it("collapses 3+ newlines and trims", () => {
    expect(hnHtmlToText("<p><p><p>hello<p><p>world<p><p>")).toBe("hello\n\nworld");
  });

  it("handles empty input", () => {
    expect(hnHtmlToText("")).toBe("");
  });
});
