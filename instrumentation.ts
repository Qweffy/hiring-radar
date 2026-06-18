import { logger } from "@/lib/logger";

interface ErrorRequest {
  path: string;
  method: string;
  headers: NodeJS.Dict<string | string[]>;
}

interface ErrorRequestContext {
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "proxy";
  renderSource?: string;
  revalidateReason?: string;
}

function digestOf(error: unknown): string | undefined {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") {
    return error.digest;
  }
  return undefined;
}

/**
 * Next's official server-error hook — fires for RSC renders, route handlers,
 * server actions and the proxy. Routes every server error into the durable
 * error log so prod stops being a black box. Request headers are intentionally
 * NOT forwarded (cookies / auth = PII). Awaited so the serverless function
 * doesn't freeze before the write lands.
 */
export async function onRequestError(
  error: unknown,
  request: ErrorRequest,
  context: ErrorRequestContext,
): Promise<void> {
  const digest = digestOf(error);
  await logger.error("request", `${request.method} ${request.path} failed`, {
    error,
    context: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      ...(context.renderSource !== undefined
        ? { renderSource: context.renderSource }
        : {}),
      ...(digest !== undefined ? { digest } : {}),
    },
  });
}
