import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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

export const sweepsRelations = relations(sweeps, ({ many }) => ({
  firstSeenPostings: many(postings),
}));

export const postingsRelations = relations(postings, ({ one }) => ({
  firstSweep: one(sweeps, {
    fields: [postings.firstSweepId],
    references: [sweeps.id],
  }),
}));
