import "server-only";

/**
 * Per-request timestamp captured on the server and threaded to client views
 * so relative times ("5h ago") render identically on SSR and hydration.
 * The browse page is fully dynamic (awaits searchParams), so "now" is
 * request-scoped data here rather than a render impurity.
 */
export const requestNowMs = (): number => Date.now();
