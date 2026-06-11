"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Empty radar — no postings ingested yet. Mirrors Browse's guidance: ingest a
 * "Who is hiring?" thread and the scope starts scanning. The CTA routes to
 * Browse (the place ingestion surfaces today; M4 adds the Pipeline trigger).
 */
export function DashboardEmpty() {
  const router = useRouter();
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <EmptyState
        illustration="empty-radar"
        title="No postings on the scope yet"
        description={
          <>Ingest a &ldquo;Who is hiring?&rdquo; thread and the radar starts scanning.</>
        }
        action="Ingest June 2026 thread"
        actionIcon="inbox"
        onAction={() => router.push("/browse")}
      />
    </div>
  );
}
