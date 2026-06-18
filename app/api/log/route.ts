import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

// Client error boundaries POST here — the browser can't write the DB directly.
const bodySchema = z.object({
  source: z.enum(["boundary", "client"]).default("client"),
  message: z.string().trim().min(1).max(2000),
  digest: z.string().max(200).optional(),
  stack: z.string().max(8000).optional(),
  path: z.string().max(500).optional(),
});

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { source, message, digest, stack, path } = parsed.data;
  // Reconstruct an Error so the client stack lands in the `stack` column.
  let error: Error | undefined;
  if (stack !== undefined) {
    error = new Error(message);
    error.stack = stack;
  }

  await logger.error(source, message, {
    error,
    context: {
      ...(digest !== undefined ? { digest } : {}),
      ...(path !== undefined ? { path } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
