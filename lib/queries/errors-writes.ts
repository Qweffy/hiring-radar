import "server-only";

import { db } from "@/db";
import {
  errorEvents,
  type ErrorContext,
  type ErrorSource,
} from "@/db/schema";

export interface ErrorEventInsert {
  level: "warn" | "error" | "fatal";
  source: ErrorSource;
  message: string;
  stack?: string | null;
  context?: ErrorContext | null;
  path?: string | null;
  digest?: string | null;
}

/** Single-statement insert into the durable error log (neon-http, no txn). */
export async function insertErrorEvent(row: ErrorEventInsert): Promise<void> {
  await db.insert(errorEvents).values({
    level: row.level,
    source: row.source,
    message: row.message.slice(0, 2000),
    stack: row.stack?.slice(0, 8000) ?? null,
    context: row.context ?? null,
    path: row.path ?? null,
    digest: row.digest ?? null,
  });
}
