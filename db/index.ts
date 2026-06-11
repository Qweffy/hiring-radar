// NOTE: no "server-only" here — the ingest/embed CLIs (tsx) import this module too.
// App-facing data access goes through lib/queries/*, which ARE server-only.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set — copy .env.example to .env.local and fill it in.",
  );
}

export const db = drizzle({ client: neon(connectionString), schema });
export { schema };
