import "server-only";

// App-facing, server-only re-export of the search engine. The engine itself
// (lib/search/engine.ts) carries no server-only guard so the bench CLI can
// import it; app code goes through this module to keep the boundary explicit.
export { searchPostings, type SearchResult } from "@/lib/search/engine";
