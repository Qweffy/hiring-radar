import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
