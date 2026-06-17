import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

// pgvector + tsvector aren't first-class drizzle types for generated columns,
// so we model search_tsv as a customType. The GENERATED ALWAYS expression and
// its GIN index live in the hand-written migration 0001 (drizzle can't emit the
// `to_tsvector(...) STORED` expression), but the column is declared here so app
// queries (lib/queries/*) can reference postings.searchTsv type-safely.
const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
});

export const parseStatus = pgEnum("parse_status", [
  "pending",
  "parsed",
  "failed",
  "skipped",
]);

export const remotePolicy = pgEnum("remote_policy", [
  "remote",
  "hybrid",
  "onsite",
]);

export const sweepStatus = pgEnum("sweep_status", [
  "running",
  "completed",
  "failed",
  "partial",
]);

export const sweepTrigger = pgEnum("sweep_trigger", [
  "manual",
  "cron",
  "backfill",
]);

export const deadLetterStage = pgEnum("dead_letter_stage", [
  "fetch",
  "parse",
  "embed",
]);

export const sweeps = pgTable("sweeps", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  threadId: bigint("thread_id", { mode: "number" }).notNull(),
  month: text("month").notNull(), // '2026-06'
  trigger: sweepTrigger("trigger").notNull().default("manual"),
  status: sweepStatus("status").notNull().default("running"),
  fetchedCount: integer("fetched_count").notNull().default(0),
  newCount: integer("new_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  parsedCount: integer("parsed_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  error: text("error"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postings = pgTable(
  "postings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    hnId: bigint("hn_id", { mode: "number" }).notNull(),
    threadId: bigint("thread_id", { mode: "number" }).notNull(),
    month: text("month").notNull(),
    author: text("author").notNull(),
    hnCreatedAt: timestamp("hn_created_at").notNull(),
    points: integer("points"),
    // Canonical source. rawText is derived (display, LLM input, search, M2 embedding input).
    rawHtml: text("raw_html").notNull(),
    rawText: text("raw_text").notNull(),
    contentHash: text("content_hash").notNull(), // sha256(rawHtml) — gates re-parsing/re-embedding
    isDeleted: boolean("is_deleted").notNull().default(false),
    isDead: boolean("is_dead").notNull().default(false),
    // Postings must survive sweep deletion — set null, not cascade.
    firstSweepId: integer("first_sweep_id").references(() => sweeps.id, {
      onDelete: "set null",
    }),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    parseStatus: parseStatus("parse_status").notNull().default("pending"),
    parseError: text("parse_error"),
    parsedAt: timestamp("parsed_at"),
    parseModel: text("parse_model"),
    // Parsed fields — null means "not stated in the posting".
    company: text("company"),
    role: text("role"),
    location: text("location"),
    companyStage: text("company_stage"),
    remotePolicy: remotePolicy("remote_policy"),
    salaryMin: integer("salary_min"), // annual, whole currency units
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    salaryRaw: text("salary_raw"),
    stackTags: text("stack_tags").array(),
    visaSponsorship: boolean("visa_sponsorship"),
    contact: text("contact"),
    // GENERATED ALWAYS over coalesce(company,'')||role||location||rawText.
    // The generation expression + GIN index are applied in migration 0001;
    // drizzle can't emit the STORED expression, so this column is declared
    // (so queries can reference it) but excluded from inserts by the DB.
    searchTsv: tsvector("search_tsv"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("postings_hn_id_unique").on(t.hnId),
    index("postings_month_created_idx").on(t.month, t.hnCreatedAt.desc()),
    index("postings_parse_status_idx").on(t.parseStatus),
    index("postings_stack_tags_idx").using("gin", t.stackTags),
  ],
);

export const postingEmbeddings = pgTable(
  "posting_embeddings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postingId: integer("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    // The posting contentHash the embedding was computed from — gates re-embeds.
    contentHash: text("content_hash").notNull(),
    model: text("model").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("posting_embeddings_posting_id_unique").on(t.postingId),
    // HNSW (vector_cosine_ops) on embedding + GIN on postings.search_tsv are
    // created in migration 0001 (drizzle-kit emits HNSW but we keep both ANN/FTS
    // index DDL together with the generated column and CREATE EXTENSION).
  ],
);

/**
 * Dead-letter sink for the Inngest pipeline. A row lands here when a stage
 * exhausts its retries (onFailure handler) — the radar then shows partial data
 * instead of silently dropping a posting. postingId is set-null so a posting can
 * be re-ingested without orphaning its failure history; hnId is kept raw because
 * a fetch-stage failure may predate any postings row.
 */
export const deadLetters = pgTable(
  "dead_letters",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    stage: deadLetterStage("stage").notNull(),
    postingId: integer("posting_id").references(() => postings.id, {
      onDelete: "set null",
    }),
    hnId: bigint("hn_id", { mode: "number" }),
    error: text("error").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("dead_letters_created_idx").on(t.createdAt.desc())],
);

// ─── M5: profile, shortlist, agent runs, assessments ───────────────────────

/** Skills bucketed by depth. Stored in profiles.skills (jsonb). */
export interface ProfileSkills {
  core: string[];
  familiar: string[];
  learning: string[];
}

/**
 * agentSteps.payload — a discriminated union mirroring agentStepKind. The DB
 * column is one jsonb blob; the kind column says which variant it holds.
 */
export type AgentStepPayload =
  | { tool: string; args: Record<string, unknown> }
  | { observation: unknown }
  | { text: string }
  | { postingId: number; score: number; verdict: string }
  | { message: string };

/** Per-step model accounting, written when a step called the LLM. */
export interface AgentStepUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
}

/** One fit/friction signal in an assessment. '+' = fit, '-' = friction. */
export interface AssessmentReason {
  sign: "+" | "-";
  text: string;
}

export const remotePref = pgEnum("remote_pref", [
  "remote_only",
  "hybrid_ok",
  "any",
]);

/**
 * Single-user profile, versioned: a save never updates in place — it inserts a
 * new row with version+1, so the latest profile is the highest version. The
 * agent run records the profileVersion it ran against, keeping past runs
 * reproducible after the profile changes.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    version: integer("version").notNull(),
    rawCv: text("raw_cv"),
    summary: text("summary"),
    // { core: string[]; familiar: string[]; learning: string[] }
    skills: jsonb("skills").$type<ProfileSkills>(),
    targetRoles: text("target_roles").array(),
    salaryFloor: integer("salary_floor"),
    remotePref: remotePref("remote_pref"),
    timezone: text("timezone"),
    companyStages: text("company_stages").array(),
    dealbreakers: text("dealbreakers").array(),
    agentInstructions: text("agent_instructions"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profiles_version_unique").on(t.version)],
);

export const agentRunStatus = pgEnum("agent_run_status", [
  "running",
  "completed",
  "failed",
  "cancelled",
  "paused",
]);

/**
 * One autonomous agent pass over the postings. stepsUsed/costUsd accrue as the
 * run advances; picksCount is the number of postings it shortlisted. A run is
 * append-only once finished — re-running starts a fresh row.
 */
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    profileVersion: integer("profile_version").notNull(),
    status: agentRunStatus("status").notNull().default("running"),
    model: text("model").notNull(),
    stepBudget: integer("step_budget").notNull(),
    stepsUsed: integer("steps_used").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    picksCount: integer("picks_count").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => [index("agent_runs_started_idx").on(t.startedAt.desc())],
);

export const agentStepKind = pgEnum("agent_step_kind", [
  "tool_call",
  "observation",
  "reasoning",
  "decision",
  "error",
]);

/**
 * Append-only trace of an agent run, ordered by idx. payload shape varies by
 * kind: a tool call carries { tool, args }, an observation carries its result,
 * reasoning/decision carry text or { postingId, score, verdict }. usage is the
 * per-step token/cost accounting when the step hit the model.
 */
export const agentSteps = pgTable(
  "agent_steps",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    runId: integer("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    kind: agentStepKind("kind").notNull(),
    payload: jsonb("payload").$type<AgentStepPayload>().notNull(),
    usage: jsonb("usage").$type<AgentStepUsage>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("agent_steps_run_idx_unique").on(t.runId, t.idx)],
);

export const shortlistStage = pgEnum("shortlist_stage", [
  "new",
  "applied",
  "interviewing",
  "offer",
  "archived",
]);

export const shortlistSource = pgEnum("shortlist_source", ["agent", "manual"]);

/**
 * One entry per posting in the user's pipeline (unique on postingId). source
 * records whether the agent or the user added it; runId links agent picks back
 * to the run that produced them (set null if the run is purged).
 */
export const shortlistEntries = pgTable(
  "shortlist_entries",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postingId: integer("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    stage: shortlistStage("stage").notNull().default("new"),
    source: shortlistSource("source").notNull(),
    runId: integer("run_id").references(() => agentRuns.id, {
      onDelete: "set null",
    }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("shortlist_entries_posting_id_unique").on(t.postingId),
    index("shortlist_entries_stage_idx").on(t.stage),
  ],
);

/** Free-text notes attached to a shortlist entry, newest-first by createdAt. */
export const shortlistNotes = pgTable(
  "shortlist_notes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    entryId: integer("entry_id")
      .notNull()
      .references(() => shortlistEntries.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("shortlist_notes_entry_idx").on(t.entryId, t.createdAt.desc())],
);

/**
 * The agent's match verdict for a posting. Unique on postingId — the latest
 * assessment wins via upsert. reasons is an ordered list of {sign,text} signals
 * ('+' for a fit signal, '-' for a friction). runId links to the producing run.
 */
export const assessments = pgTable(
  "assessments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postingId: integer("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    runId: integer("run_id").references(() => agentRuns.id, {
      onDelete: "set null",
    }),
    score: integer("score").notNull(),
    reasons: jsonb("reasons").$type<AssessmentReason[]>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("assessments_posting_id_unique").on(t.postingId)],
);

// ─── M7: MCP API keys + app settings ───────────────────────────────────────

export const apiKeyScope = pgEnum("api_key_scope", ["read", "read_write"]);

/**
 * MCP bearer keys. The raw key (`hrk_…`) is shown ONCE at creation and never
 * stored — only its sha256 (`keyHash`) for verification and the first ~8 chars
 * (`keyPrefix`) for display ("hrk_3a9f…"). `lastUsedAt` is bumped on every
 * successful verify, which is what keeps the Settings "connected clients"
 * indicator live. A revoked key keeps its row (revokedAt set) for the audit
 * trail; verify treats any non-null revokedAt as invalid.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    scope: apiKeyScope("scope").notNull().default("read"),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [uniqueIndex("api_keys_key_hash_unique").on(t.keyHash)],
);

/**
 * Single-row typed settings store. A fixed primary key (id = 1) means the table
 * holds at most one row; reads seed-on-miss with the DEFAULT_BUDGET-derived
 * defaults and writes upsert onto id=1, so there's never more than one row and
 * neon-http's lack of transactions can't race two rows into existence.
 */
export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  agentStepBudget: integer("agent_step_budget").notNull().default(24),
  agentMaxUsd: real("agent_max_usd").notNull().default(1.0),
  notifySweep: boolean("notify_sweep").notNull().default(true),
  notifyAgentRun: boolean("notify_agent_run").notNull().default(true),
  notifyHighMatch: boolean("notify_high_match").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sweepsRelations = relations(sweeps, ({ many }) => ({
  firstSeenPostings: many(postings),
}));

export const postingsRelations = relations(postings, ({ one }) => ({
  firstSweep: one(sweeps, {
    fields: [postings.firstSweepId],
    references: [sweeps.id],
  }),
  embedding: one(postingEmbeddings, {
    fields: [postings.id],
    references: [postingEmbeddings.postingId],
  }),
}));

export const postingEmbeddingsRelations = relations(
  postingEmbeddings,
  ({ one }) => ({
    posting: one(postings, {
      fields: [postingEmbeddings.postingId],
      references: [postings.id],
    }),
  }),
);

export const agentRunsRelations = relations(agentRuns, ({ many }) => ({
  steps: many(agentSteps),
  picks: many(shortlistEntries),
  assessments: many(assessments),
}));

export const agentStepsRelations = relations(agentSteps, ({ one }) => ({
  run: one(agentRuns, {
    fields: [agentSteps.runId],
    references: [agentRuns.id],
  }),
}));

export const shortlistEntriesRelations = relations(
  shortlistEntries,
  ({ one, many }) => ({
    posting: one(postings, {
      fields: [shortlistEntries.postingId],
      references: [postings.id],
    }),
    run: one(agentRuns, {
      fields: [shortlistEntries.runId],
      references: [agentRuns.id],
    }),
    notes: many(shortlistNotes),
  }),
);

export const shortlistNotesRelations = relations(shortlistNotes, ({ one }) => ({
  entry: one(shortlistEntries, {
    fields: [shortlistNotes.entryId],
    references: [shortlistEntries.id],
  }),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  posting: one(postings, {
    fields: [assessments.postingId],
    references: [postings.id],
  }),
  run: one(agentRuns, {
    fields: [assessments.runId],
    references: [agentRuns.id],
  }),
}));
