import { createHash } from "node:crypto";

/** sha256 hex of the raw HTML — gates re-parsing and re-embedding on edits. */
export function contentHash(rawHtml: string): string {
  return createHash("sha256").update(rawHtml, "utf8").digest("hex");
}
