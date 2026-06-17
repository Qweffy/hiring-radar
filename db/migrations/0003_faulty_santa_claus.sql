CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'completed', 'failed', 'cancelled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."agent_step_kind" AS ENUM('tool_call', 'observation', 'reasoning', 'decision', 'error');--> statement-breakpoint
CREATE TYPE "public"."remote_pref" AS ENUM('remote_only', 'hybrid_ok', 'any');--> statement-breakpoint
CREATE TYPE "public"."shortlist_source" AS ENUM('agent', 'manual');--> statement-breakpoint
CREATE TYPE "public"."shortlist_stage" AS ENUM('new', 'applied', 'interviewing', 'offer', 'archived');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agent_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"profile_version" integer NOT NULL,
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"model" text NOT NULL,
	"step_budget" integer NOT NULL,
	"steps_used" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"picks_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_steps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agent_steps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"run_id" integer NOT NULL,
	"idx" integer NOT NULL,
	"kind" "agent_step_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"usage" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assessments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"posting_id" integer NOT NULL,
	"run_id" integer,
	"score" integer NOT NULL,
	"reasons" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"version" integer NOT NULL,
	"raw_cv" text,
	"summary" text,
	"skills" jsonb,
	"target_roles" text[],
	"salary_floor" integer,
	"remote_pref" "remote_pref",
	"timezone" text,
	"company_stages" text[],
	"dealbreakers" text[],
	"agent_instructions" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortlist_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shortlist_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"posting_id" integer NOT NULL,
	"stage" "shortlist_stage" DEFAULT 'new' NOT NULL,
	"source" "shortlist_source" NOT NULL,
	"run_id" integer,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortlist_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shortlist_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entry_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_posting_id_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_entries" ADD CONSTRAINT "shortlist_entries_posting_id_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_entries" ADD CONSTRAINT "shortlist_entries_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_notes" ADD CONSTRAINT "shortlist_notes_entry_id_shortlist_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."shortlist_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_started_idx" ON "agent_runs" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "agent_steps_run_idx_unique" ON "agent_steps" USING btree ("run_id","idx");--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_posting_id_unique" ON "assessments" USING btree ("posting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_version_unique" ON "profiles" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "shortlist_entries_posting_id_unique" ON "shortlist_entries" USING btree ("posting_id");--> statement-breakpoint
CREATE INDEX "shortlist_entries_stage_idx" ON "shortlist_entries" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "shortlist_notes_entry_idx" ON "shortlist_notes" USING btree ("entry_id","created_at" DESC NULLS LAST);