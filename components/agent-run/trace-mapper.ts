import  { type TraceStep } from "@/components/agent-run/trace-types";
import  { type AgentStepRow } from "@/lib/queries/agent-runs";

/**
 * Fold the persisted append-only step log into the richer TraceStep cards the
 * timeline renders. The DB writes, per tool turn: a `tool_call` row then a
 * matching `observation` row; the design wants ONE tool card with the
 * observation as a phosphor chip — so we look ahead from each tool_call to its
 * observation and merge them. `reasoning`, `decision`, and `error` rows map
 * one-to-one.
 *
 * Pure and incremental-safe: re-running it over a growing rows[] (as SSE
 * appends steps) yields a stable, extended timeline, and the last reasoning
 * step is flagged `live` only while the run is still running.
 */

interface ObservationError { error: { type: string; message: string } }

function isErrorObservation(o: unknown): o is ObservationError {
  return (
    typeof o === "object" &&
    o !== null &&
    "error" in o &&
    typeof (o).error === "object" &&
    (o).error !== null
  );
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Count the skills across a profile skills object ({core,familiar,learning}). */
function countSkills(skills: unknown): number | null {
  const rec = asRecord(skills);
  if (!rec) return null;
  let n = 0;
  for (const key of ["core", "familiar", "learning"]) {
    const arr = rec[key];
    if (Array.isArray(arr)) n += arr.length;
  }
  return n;
}

/**
 * The phosphor "→ …" chip text for a tool, from its observation result. Falls
 * back to a generic "→ done" so a card always shows a chip (the design always
 * renders the observation chip, even when the shape is unfamiliar).
 */
function observationChip(tool: string, observation: unknown): string {
  if (isErrorObservation(observation)) {
    const message = stringOrNull(observation.error.message) ?? observation.error.type;
    return `→ error · ${message}`;
  }

  const rec = asRecord(observation);

  switch (tool) {
    case "get_profile": {
      const n = countSkills(rec?.skills);
      return n !== null ? `→ profile · ${n} skills` : "→ profile loaded";
    }
    case "search_jobs": {
      const count = numberOr(rec?.count, 0);
      return `→ ${count} result${count === 1 ? "" : "s"}`;
    }
    case "read_posting": {
      const company = stringOrNull(rec?.company);
      return company ? `→ ${company} · parsed ok` : "→ parsed ok";
    }
    case "compare_to_profile": {
      const posting = asRecord(rec?.posting);
      const company = stringOrNull(posting?.company);
      return company ? `→ ${company} · compared` : "→ compared to profile";
    }
    case "save_finding": {
      const decision = stringOrNull(rec?.decision);
      if (decision === "shortlist") return "→ shortlisted";
      if (decision === "dismiss") return "→ dismissed";
      return "→ saved";
    }
    default:
      return "→ done";
  }
}

/** Record an hnId → company pair if both are present on the object. */
function noteCompany(obj: Record<string, unknown> | null, into: Map<number, string>): void {
  if (!obj) return;
  const hnId = obj.hnId;
  const company = stringOrNull(obj.company);
  if (typeof hnId === "number" && company) into.set(hnId, company);
}

/**
 * Harvest hnId → company pairs from any tool observation, regardless of tool —
 * read_posting carries them at the top level, compare_to_profile nests them
 * under `posting`, and search_jobs lists them under `results`. A decision card
 * (which stores only the hnId) reads its company name back from this map.
 */
function harvestCompanies(observation: unknown, into: Map<number, string>): void {
  if (isErrorObservation(observation)) return;
  const rec = asRecord(observation);
  if (!rec) return;

  noteCompany(rec, into); // read_posting
  noteCompany(asRecord(rec.posting), into); // compare_to_profile
  if (Array.isArray(rec.results)) {
    for (const hit of rec.results) noteCompany(asRecord(hit), into); // search_jobs
  }
}

/** Single-line args preview: compact JSON, no surrounding noise. */
function compactArgs(args: Record<string, unknown>): string {
  const json = JSON.stringify(args);
  if (json === "{}" || json === undefined) return "";
  // Add a space inside the braces to match the design's spaced one-liner.
  return json.replace(/^\{/, "{ ").replace(/\}$/, " }").replace(/,/g, ", ");
}

interface ToolCallPayload { tool: string; args: Record<string, unknown> }
interface ReasoningPayload { text: string }
interface DecisionPayload { postingId: number; score: number; verdict: string }
interface ErrorPayload { message: string }

/**
 * Map the run's step rows to TraceStep cards. `running` flags the final
 * reasoning card as live (streaming) so it shows the "Thinking…" pulse.
 */
export function mapTrace(
  rows: AgentStepRow[],
  running: boolean,
): TraceStep[] {
  const companies = new Map<number, string>();
  // First pass: harvest hnId → company from every observation so a decision
  // card (which only stores postingId/hnId) can name its company.
  for (const row of rows) {
    if (row.kind === "observation") {
      const payload = row.payload as { observation?: unknown };
      harvestCompanies(payload.observation, companies);
    }
  }

  const steps: TraceStep[] = [];
  // Index observations by the tool_call idx that precedes them so we can fold
  // an observation into its tool card. Observations follow their call in idx
  // order; we pair each tool_call with the next observation not yet consumed.
  const observations = rows.filter((r) => r.kind === "observation");
  let obsCursor = 0;

  for (const row of rows) {
    if (row.kind === "tool_call") {
      const p = row.payload as ToolCallPayload;
      const tool = p.tool ?? "tool";
      const args = (p.args ?? {});

      // Find this call's observation: the first observation with idx > the call
      // idx that hasn't been consumed yet.
      while (
        obsCursor < observations.length &&
        observations[obsCursor].idx <= row.idx
      ) {
        obsCursor++;
      }
      const obsRow = observations[obsCursor];
      let obs = "→ running…";
      if (obsRow) {
        const obsPayload = obsRow.payload as { observation?: unknown };
        obs = observationChip(tool, obsPayload.observation);
        obsCursor++;
      }

      const argsLine = compactArgs(args);
      steps.push({
        key: row.idx,
        type: "tool",
        name: tool,
        argsLine: argsLine || undefined,
        argsJson: argsLine ? JSON.stringify(args, null, 2) : undefined,
        obs,
      });
      continue;
    }

    if (row.kind === "observation") {
      continue; // folded into its tool card above
    }

    if (row.kind === "reasoning") {
      const p = row.payload as ReasoningPayload;
      const text = typeof p.text === "string" ? p.text.trim() : "";
      if (text.length === 0) continue; // empty reasoning turns add no signal
      steps.push({ key: row.idx, type: "reasoning", text });
      continue;
    }

    if (row.kind === "decision") {
      const p = row.payload as DecisionPayload;
      const yes = p.verdict === "shortlist";
      const company = companies.get(p.postingId) ?? `Posting #${p.postingId}`;
      const verb = yes ? "Shortlisted" : "Dismissed";
      steps.push({
        key: row.idx,
        type: "decision",
        decision: yes ? "yes" : "no",
        text: `${verb} ${company} — score ${p.score}`,
        chipCompany: company,
        chipScore: String(p.score),
        chipHnId: p.postingId,
      });
      continue;
    }

    if (row.kind === "error") {
      const p = row.payload as ErrorPayload;
      steps.push({
        key: row.idx,
        type: "error",
        text: typeof p.message === "string" ? p.message : "Error",
      });
      continue;
    }
  }

  // Flag the trailing reasoning card live while the run is still running.
  if (running) {
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].type === "reasoning") {
        steps[i] = { ...steps[i], live: true };
        break;
      }
    }
  }

  return steps;
}
