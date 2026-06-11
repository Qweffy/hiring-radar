// Inngest v4 client + typed event definitions. v4 uses Standard Schema, which
// Zod v4 implements natively, so each eventType doubles as a runtime validator
// and a typed trigger. No "server-only": the client is imported by the route
// handler (Node runtime) and could be imported by a backfill CLI.
import { Inngest, eventType } from "inngest";
import { z } from "zod";

/**
 * A sweep was requested for a specific HN thread + month. Emitted by the
 * discover cron and by manual/backfill callers; consumed by runSweep. The
 * trigger is parameterised so scheduled ingestion and backfills share one path.
 */
export const sweepRequested = eventType("hn/sweep.requested", {
  // eventType disallows schema transforms (input must equal output), so `trigger`
  // is a plain required enum — callers always supply it. The sweeps row defaults
  // to "manual" at the DB layer if ever omitted upstream.
  schema: z.object({
    threadId: z.number().int().positive(),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    trigger: z.enum(["manual", "cron", "backfill"]),
  }),
});

/**
 * One posting was inserted or content-changed by a sweep and needs parse +
 * embed. Fanned out one-per-posting by runSweep; consumed by processPosting.
 * Carries the posting id (the durable key) so the worker re-reads fresh state.
 */
export const postingUpserted = eventType("hn/posting.upserted", {
  schema: z.object({
    postingId: z.number().int().positive(),
    hnId: z.number().int().positive(),
    sweepId: z.number().int().positive(),
    change: z.enum(["new", "updated"]),
  }),
});

export const inngest = new Inngest({
  id: "hiring-radar",
  // Falls back to INNGEST_EVENT_KEY automatically; named here for clarity.
  eventKey: process.env.INNGEST_EVENT_KEY,
  // v4 runs multiple steps per request; cap runtime ~10s below the route's
  // maxDuration (60s) so a checkpointed multi-step request never times out.
  checkpointing: { maxRuntime: "50s" },
});
