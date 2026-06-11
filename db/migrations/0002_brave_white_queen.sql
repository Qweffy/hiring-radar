CREATE TYPE "public"."dead_letter_stage" AS ENUM('fetch', 'parse', 'embed');--> statement-breakpoint
CREATE TABLE "dead_letters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dead_letters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stage" "dead_letter_stage" NOT NULL,
	"posting_id" integer,
	"hn_id" bigint,
	"error" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dead_letters" ADD CONSTRAINT "dead_letters_posting_id_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."postings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dead_letters_created_idx" ON "dead_letters" USING btree ("created_at" DESC NULLS LAST);