CREATE TYPE "public"."parse_status" AS ENUM('pending', 'parsed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."remote_policy" AS ENUM('remote', 'hybrid', 'onsite');--> statement-breakpoint
CREATE TYPE "public"."sweep_status" AS ENUM('running', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."sweep_trigger" AS ENUM('manual', 'cron', 'backfill');--> statement-breakpoint
CREATE TABLE "postings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "postings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"hn_id" bigint NOT NULL,
	"thread_id" bigint NOT NULL,
	"month" text NOT NULL,
	"author" text NOT NULL,
	"hn_created_at" timestamp NOT NULL,
	"points" integer,
	"raw_html" text NOT NULL,
	"raw_text" text NOT NULL,
	"content_hash" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"is_dead" boolean DEFAULT false NOT NULL,
	"first_sweep_id" integer,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"parse_status" "parse_status" DEFAULT 'pending' NOT NULL,
	"parse_error" text,
	"parsed_at" timestamp,
	"parse_model" text,
	"company" text,
	"role" text,
	"location" text,
	"company_stage" text,
	"remote_policy" "remote_policy",
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text,
	"salary_raw" text,
	"stack_tags" text[],
	"visa_sponsorship" boolean,
	"contact" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sweeps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sweeps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"thread_id" bigint NOT NULL,
	"month" text NOT NULL,
	"trigger" "sweep_trigger" DEFAULT 'manual' NOT NULL,
	"status" "sweep_status" DEFAULT 'running' NOT NULL,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"new_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"parsed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_first_sweep_id_sweeps_id_fk" FOREIGN KEY ("first_sweep_id") REFERENCES "public"."sweeps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "postings_hn_id_unique" ON "postings" USING btree ("hn_id");--> statement-breakpoint
CREATE INDEX "postings_month_created_idx" ON "postings" USING btree ("month","hn_created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "postings_parse_status_idx" ON "postings" USING btree ("parse_status");--> statement-breakpoint
CREATE INDEX "postings_stack_tags_idx" ON "postings" USING gin ("stack_tags");