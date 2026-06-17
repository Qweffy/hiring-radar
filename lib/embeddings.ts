// Local feature-extraction embeddings via @huggingface/transformers v4.
// Server-only-safe: imported by both the Next.js Node runtime and tsx CLIs.
// No "server-only" guard here (the embed CLI imports it); never import from a
// client component or an edge route — @huggingface/transformers needs Node.
import path from "node:path";

// Type-only import — erased at compile time, so it never loads the native addon.
import  { type FeatureExtractionPipeline } from "@huggingface/transformers";

// MongoDB/mdbr-leaf-ir: 384-dim, MiniLM-speed, #1 BEIR <=100M params. Loads
// cleanly in transformers v4 and outputs unit-norm vectors with mean pooling.
export const EMBEDDING_MODEL = "MongoDB/mdbr-leaf-ir";
export const EMBEDDING_DIMS = 384;

// Pin the dtype next to the model id — index and query vectors MUST come from
// the same model AND dtype. Node default device is cpu -> fp32.
const DTYPE = "fp32";

// Process-wide lazy singleton stashed on globalThis so it survives Next.js HMR
// (re-instantiating per request/HMR cycle leaks a full model copy each time).
const globalForEmbedder = globalThis as unknown as {
  __embedderPipeline?: Promise<FeatureExtractionPipeline>;
};

async function buildEmbedder(): Promise<FeatureExtractionPipeline> {
  // Dynamic import so merely importing THIS module never loads onnxruntime-node's
  // native addon — only an actual embed() call does. On a runtime without the
  // native lib (e.g. Vercel serverless), this throws and callers degrade to
  // full-text search instead of crashing the route (lib/search/engine.ts).
  const { env, pipeline } = await import("@huggingface/transformers");
  // Own the cache: the default lives in node_modules and dies on reinstall.
  // In the bundled Next.js server build `import.meta.dirname` is undefined, so
  // fall back to a cwd-relative path — never pass undefined to path.resolve.
  const moduleDir = import.meta.dirname;
  env.cacheDir = moduleDir
    ? path.resolve(moduleDir, "..", ".cache", "transformers")
    : path.resolve(process.cwd(), ".cache", "transformers");
  return pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: DTYPE });
}

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  globalForEmbedder.__embedderPipeline ??= buildEmbedder().catch((e: unknown) => {
    // Don't cache the rejection — let a later call retry if the env changes.
    globalForEmbedder.__embedderPipeline = undefined;
    throw e;
  });
  return globalForEmbedder.__embedderPipeline;
}

/** Embed a batch of texts → array of 384-dim unit-norm vectors (same order). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const embedder = await getEmbedder();
  // pooling/normalize default to 'none'/false — opt in, or you get per-token
  // vectors. Normalized output lets pgvector cosine/inner-product agree.
  const output = await embedder(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

/** Embed a single text → one 384-dim unit-norm vector. */
export async function embed(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  if (!vector) throw new Error("embed: pipeline returned no vector");
  return vector;
}
