-- pgvector must exist before the vector(384) column type resolves.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "posting_embeddings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posting_embeddings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"posting_id" integer NOT NULL,
	"content_hash" text NOT NULL,
	"model" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- GENERATED ALWAYS tsvector over the searchable fields. Drizzle emits a plain
-- "search_tsv" tsvector column; we replace it with the STORED generation
-- expression it can't express. coalesce() guards the nullable parsed fields.
ALTER TABLE "postings" ADD COLUMN "search_tsv" tsvector GENERATED ALWAYS AS (
	to_tsvector('english',
		coalesce("company", '') || ' ' ||
		coalesce("role", '') || ' ' ||
		coalesce("location", '') || ' ' ||
		coalesce("raw_text", '')
	)
) STORED;--> statement-breakpoint
ALTER TABLE "posting_embeddings" ADD CONSTRAINT "posting_embeddings_posting_id_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "posting_embeddings_posting_id_unique" ON "posting_embeddings" USING btree ("posting_id");--> statement-breakpoint
-- HNSW ANN index for cosine similarity (vectors are normalized at embed time).
CREATE INDEX "posting_embeddings_embedding_hnsw_idx" ON "posting_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
-- GIN index for the lexical (full-text) branch of hybrid search.
CREATE INDEX "postings_search_tsv_gin_idx" ON "postings" USING gin ("search_tsv");
