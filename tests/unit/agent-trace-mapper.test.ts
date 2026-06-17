import { describe, expect, it } from "vitest";
import { mapTrace } from "@/components/agent-run/trace-mapper";
import type { AgentStepRow } from "@/lib/queries/agent-runs";

/**
 * The trace mapper folds the persisted append-only step log (tool_call +
 * observation pairs, reasoning, decision, error) into the richer cards the
 * timeline renders. These cover the folds the design depends on: a tool card
 * carries its observation chip, an empty reasoning turn is dropped, a decision
 * names its company from a prior observation, and the live flag lands on the
 * trailing reasoning card only while running.
 */

let nextIdx = 0;
function row(
  kind: AgentStepRow["kind"],
  payload: unknown,
): AgentStepRow {
  return {
    id: nextIdx,
    runId: 1,
    idx: nextIdx++,
    kind,
    payload: payload as AgentStepRow["payload"],
    usage: null,
    createdAt: new Date(0),
  };
}

function reset(): void {
  nextIdx = 0;
}

describe("mapTrace", () => {
  it("folds a tool_call + observation into one tool card with its chip", () => {
    reset();
    const steps = mapTrace(
      [
        row("tool_call", { tool: "search_jobs", args: { query: "typescript ai" } }),
        row("observation", { observation: { month: "2026-06", count: 42, results: [] } }),
      ],
      false,
    );
    expect(steps).toHaveLength(1);
    const tool = steps[0]!;
    expect(tool.type).toBe("tool");
    expect(tool.name).toBe("search_jobs");
    expect(tool.obs).toBe("→ 42 results");
    expect(tool.argsLine).toContain("typescript ai");
    expect(tool.argsJson).toContain("\n"); // pretty-printed for the expander
  });

  it("renders the read_posting chip with the parsed company", () => {
    reset();
    const steps = mapTrace(
      [
        row("tool_call", { tool: "read_posting", args: { hnId: 48357801 } }),
        row("observation", { observation: { hnId: 48357801, company: "Meridian Labs" } }),
      ],
      false,
    );
    expect(steps[0]!.obs).toBe("→ Meridian Labs · parsed ok");
  });

  it("names a decision's company from an earlier observation", () => {
    reset();
    const steps = mapTrace(
      [
        row("tool_call", { tool: "read_posting", args: { hnId: 99 } }),
        row("observation", { observation: { hnId: 99, company: "Quietwire" } }),
        row("decision", { postingId: 99, score: 88, verdict: "shortlist" }),
      ],
      false,
    );
    const decision = steps.find((s) => s.type === "decision")!;
    expect(decision.decision).toBe("yes");
    expect(decision.chipCompany).toBe("Quietwire");
    expect(decision.chipScore).toBe("88");
    expect(decision.chipHnId).toBe(99);
    expect(decision.text).toBe("Shortlisted Quietwire — score 88");
  });

  it("marks a dismiss decision as 'no'", () => {
    reset();
    const steps = mapTrace(
      [row("decision", { postingId: 42, score: 30, verdict: "dismiss" })],
      false,
    );
    const decision = steps[0]!;
    expect(decision.decision).toBe("no");
    expect(decision.text).toBe("Dismissed Posting #42 — score 30");
  });

  it("drops empty reasoning turns but keeps text ones", () => {
    reset();
    const steps = mapTrace(
      [
        row("reasoning", { text: "" }),
        row("reasoning", { text: "Narrowing to AI roles." }),
      ],
      false,
    );
    expect(steps).toHaveLength(1);
    expect(steps[0]!.text).toBe("Narrowing to AI roles.");
  });

  it("flags only the trailing reasoning card live while running", () => {
    reset();
    const steps = mapTrace(
      [
        row("reasoning", { text: "First thought." }),
        row("tool_call", { tool: "get_profile", args: {} }),
        row("observation", { observation: { skills: { core: ["ts"], familiar: [], learning: [] } } }),
        row("reasoning", { text: "Second thought." }),
      ],
      true,
    );
    const reasoning = steps.filter((s) => s.type === "reasoning");
    expect(reasoning).toHaveLength(2);
    expect(reasoning[0]!.live).toBeFalsy();
    expect(reasoning[1]!.live).toBe(true);
  });

  it("does not flag any card live for a finished run", () => {
    reset();
    const steps = mapTrace([row("reasoning", { text: "Done." })], false);
    expect(steps[0]!.live).toBeFalsy();
  });

  it("surfaces an error observation as an error chip on the tool card", () => {
    reset();
    const steps = mapTrace(
      [
        row("tool_call", { tool: "read_posting", args: { hnId: 7 } }),
        row("observation", {
          observation: { error: { type: "NotFound", message: "No posting with hnId 7." } },
        }),
      ],
      false,
    );
    expect(steps[0]!.obs).toBe("→ error · No posting with hnId 7.");
  });

  it("maps a get_profile chip to the total skills count", () => {
    reset();
    const steps = mapTrace(
      [
        row("tool_call", { tool: "get_profile", args: {} }),
        row("observation", {
          observation: { skills: { core: ["ts", "next"], familiar: ["go"], learning: [] } },
        }),
      ],
      false,
    );
    expect(steps[0]!.obs).toBe("→ profile · 3 skills");
    // No args → no expandable line on the card.
    expect(steps[0]!.argsLine).toBeUndefined();
  });
});
