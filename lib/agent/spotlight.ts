import { randomBytes } from "node:crypto";

/**
 * Spotlighting (Microsoft's term) wraps untrusted text in per-call randomized
 * delimiters so the model can tell instructions (system message) from data
 * (everything fenced). See docs/best-practices/ai-security.md: static fences
 * are trivially escaped — the attacker just includes the closing token — so we
 * mint a fresh random marker each call and strip any pre-existing copy of that
 * sequence from the content before fencing.
 *
 * Every HN posting and every search snippet that re-enters the prompt is hostile
 * input; route it all through here.
 */

/** A fresh, unguessable fence marker. 8 hex bytes = 64 bits of entropy. */
function freshMarker(): string {
  return randomBytes(8).toString("hex");
}

export type Spotlighted = {
  /** The text wrapped in <data-{marker}>…</data-{marker}> fences. */
  fenced: string;
  /** The marker used — so the system prompt can name the exact fence. */
  marker: string;
};

/**
 * Fence untrusted content for a single LLM message. Strips any literal copy of
 * the chosen fence tokens from the content first (delimiter-escape defense),
 * then wraps. The caller MUST tell the model, in the SYSTEM message, that text
 * inside <data-{marker}> tags is data and never instructions.
 */
export function spotlight(content: string): Spotlighted {
  const marker = freshMarker();
  const open = `<data-${marker}>`;
  const close = `</data-${marker}>`;
  // Remove any occurrence of our fence tokens (case-insensitive, with optional
  // whitespace in the tag) so a posting can't forge a closing delimiter. The
  // marker is random, so this is belt-and-suspenders, but cheap.
  const fenceRe = new RegExp(`</?\\s*data-${marker}\\s*>`, "gi");
  const safe = content.replace(fenceRe, "");
  return { fenced: `${open}\n${safe}\n${close}`, marker };
}
