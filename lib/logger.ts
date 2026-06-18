// Structured logger + durable sink. Intentionally dependency-light and NOT
// `server-only` so `instrumentation.ts`, server actions and the /api/log route
// can all import it; the DB writer is dynamically imported behind a
// `typeof window` guard so neon never lands in a client bundle.
import { type ErrorContext, type ErrorSource } from "@/db/schema";

export type LogLevel = "warn" | "error" | "fatal";

export interface LogOptions {
  /** An Error (or anything) whose message/stack enriches the event. */
  error?: unknown;
  /** Structured context; secret/PII-looking keys are redacted before write. */
  context?: ErrorContext;
}

// Keys whose values are stripped before an event is logged or persisted.
const REDACT_KEY = /(cookie|authorization|^auth$|token|password|secret|api[-_]?key)/i;

/** Replace secret/PII-looking values with "[redacted]". Exported for testing. */
export function redactContext(
  context: ErrorContext | undefined,
): ErrorContext | undefined {
  if (context === undefined) return undefined;
  const out: ErrorContext = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = REDACT_KEY.test(key) ? "[redacted]" : value;
  }
  return out;
}

function errorParts(error: unknown): { message: string | null; stack: string | null } {
  if (error instanceof Error) return { message: error.message, stack: error.stack ?? null };
  if (error === undefined) return { message: null, stack: null };
  if (typeof error === "string") return { message: error, stack: null };
  try {
    return { message: JSON.stringify(error), stack: null };
  } catch {
    return { message: "[unserializable error]", stack: null };
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Log a structured event: always a JSON line to the Vercel console (greppable),
 * plus a best-effort durable row in `error_events` on the server. A sink failure
 * is swallowed — observability must never break the request it's observing.
 * Returns the persist promise so callers that must not let the serverless
 * function freeze before the write lands (e.g. `onRequestError`) can await it.
 */
export function logEvent(
  level: LogLevel,
  source: ErrorSource,
  message: string,
  options: LogOptions = {},
): Promise<void> {
  const parts = errorParts(options.error);
  const fullMessage =
    parts.message !== null && parts.message !== message
      ? `${message}: ${parts.message}`
      : message;
  const context = redactContext(options.context);

  const line = JSON.stringify({
    level,
    source,
    message: fullMessage,
    ...(context !== undefined ? { context } : {}),
  });
  if (level === "warn") console.warn(line);
  else console.error(line);

  if (typeof window !== "undefined") return Promise.resolve();
  return persist({
    level,
    source,
    message: fullMessage,
    stack: parts.stack,
    context: context ?? null,
    path: asString(context?.path),
    digest: asString(context?.digest),
  });
}

async function persist(row: {
  level: LogLevel;
  source: ErrorSource;
  message: string;
  stack: string | null;
  context: ErrorContext | null;
  path: string | null;
  digest: string | null;
}): Promise<void> {
  try {
    const { insertErrorEvent } = await import("@/lib/queries/errors-writes");
    await insertErrorEvent(row);
  } catch {
    // The console line above is the fallback; a sink fault must never surface.
  }
}

export const logger = {
  warn: (source: ErrorSource, message: string, options?: LogOptions) =>
    logEvent("warn", source, message, options),
  error: (source: ErrorSource, message: string, options?: LogOptions) =>
    logEvent("error", source, message, options),
  fatal: (source: ErrorSource, message: string, options?: LogOptions) =>
    logEvent("fatal", source, message, options),
};
