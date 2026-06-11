/**
 * HN comment HTML is a tiny dialect: <p>, <i>/<b>, <a href>, <pre><code>
 * and entities. We convert to plain text for display, search, LLM input
 * and (later) embeddings. The raw HTML stays in the DB, so this function
 * is re-runnable derived data.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

// Sentinel token — effectively impossible in real HN comment text.
const CODE_OPEN = "@@HRCODEBLOCK";
const CODE_CLOSE = "@@";

export function hnHtmlToText(html: string): string {
  let s = html;

  // Preserve code blocks verbatim (entity-decoded) before any tag stripping.
  const codeBlocks: string[] = [];
  s = s.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (_, code: string) => {
    codeBlocks.push(decodeEntities(code).replace(/\s+$/, ""));
    return `${CODE_OPEN}${codeBlocks.length - 1}${CODE_CLOSE}`;
  });

  s = s.replace(/<p>/g, "\n\n").replace(/<\/p>/g, "");
  s = s.replace(/<br\s*\/?>/g, "\n");

  // Links: keep the label; HN truncates long URLs as the label ("https://x.com/a..."),
  // in that case the href is the real content — use it instead.
  s = s.replace(
    /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
    (_, href: string, label: string) => {
      const text = decodeEntities(label.replace(/<[^>]+>/g, ""));
      return text.endsWith("...") ? decodeEntities(href) : text;
    },
  );

  s = s.replace(/<\/?(?:i|b|em|strong|u)>/g, "");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);

  s = s.replace(/@@HRCODEBLOCK(\d+)@@/g, (_, i: string) => `\n${codeBlocks[Number(i)] ?? ""}\n`);

  return s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
