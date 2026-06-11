# Local Embeddings with transformers.js in Node — Best Practices
> Researched 2026-06-10. Sources verified against current official docs.

## TL;DR
- Install `@huggingface/transformers` v4 (4.2.0, Apr 2026). Never `@xenova/transformers` — abandoned at v2.
- Pin `dtype` explicitly on every load; index and query vectors must come from the same model **and** dtype.
- Embed with `{ pooling: 'mean', normalize: true }` so pgvector inner product (`<#>`) equals cosine similarity.
- MiniLM is superseded. Default: `MongoDB/mdbr-leaf-ir` (384-dim, MiniLM-speed, top BEIR ≤100M). Quality tier: `onnx-community/embeddinggemma-300m-ONNX` (768-dim MRL, 2K context).
- One process-wide lazy singleton per pipeline; in Next.js dev, stash it on `globalThis` to survive HMR.
- Set `env.cacheDir` explicitly (default lives inside `node_modules/.../.cache` and dies on reinstall); pre-download models in a setup script, never on first user request.

## Practices

**Use `@huggingface/transformers` v4 with `pipeline('feature-extraction')`.** v4 (Mar 2026) ships a new C++ runtime co-developed with the ONNX Runtime team and runs the same code in Node, Bun, Deno and browsers. BERT-class embedding models got a ~4x speedup via fused `MultiHeadAttention` ops — but only in re-exported models (`onnx-community/*-ONNX` repos), so prefer those over legacy `Xenova/*` exports. ESM-first; from CJS use dynamic `await import()`. https://huggingface.co/blog/transformersjs-v4 · https://huggingface.co/docs/transformers.js/en/tutorials/node

**Pick the model deliberately — MiniLM is a 2021 baseline, not a 2026 default.**

| Model | Dims | Weights (disk) | Context | Notes |
|---|---|---|---|---|
| `MongoDB/mdbr-leaf-ir` | 384 | ~90 MB fp32 | 512 | MiniLM architecture, #1 BEIR ≤100M params; supports MRL + int8/binary quantization. **Recommended default for hiring-radar.** |
| `onnx-community/embeddinggemma-300m-ONNX` | 768 (MRL → 512/256/128) | 309 MB q8 / 197 MB q4 | 2048 | Best small-model quality; whole HN postings fit without chunking. Needs task prefixes; no fp16. |
| `Xenova/bge-small-en-v1.5` | 384 | 133 MB fp32 / 34 MB q8 | 512 | Solid; query prefix `"Represent this sentence for searching relevant passages: "`. v2-era export (no v4 op fusion). |
| `onnx-community/all-MiniLM-L6-v2-ONNX` | 384 | 90 MB fp32 / 30 MB q4f16 | 512 | Prototyping only; weakest retrieval quality of the four. |

Sources: https://huggingface.co/MongoDB/mdbr-leaf-ir · https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX · https://news.ycombinator.com/item?id=46081800

**Singleton pipeline, HMR-safe.** Model load takes seconds and hundreds of MB — construct once per process. The `globalThis` guard is the official pattern for Next.js dev hot reload. https://huggingface.co/docs/transformers.js/tutorials/next

```ts
// lib/embeddings.ts
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL_ID = "MongoDB/mdbr-leaf-ir";
const DTYPE = "fp32"; // pin it — q8 and fp32 produce (slightly) different vectors

const g = globalThis as unknown as { __embedder?: Promise<FeatureExtractionPipeline> };

export const getEmbedder = () =>
  (g.__embedder ??= pipeline("feature-extraction", MODEL_ID, { dtype: DTYPE }));

export async function embed(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder();
  const output = await embedder(texts, { pooling: "mean", normalize: true });
  return output.tolist();
}
```

**Normalize at embed time; use inner product in pgvector.** `FeatureExtractionPipeline` defaults are `pooling: 'none'`, `normalize: false` — you must opt in. With unit-norm vectors, cosine ≡ dot product, so use pgvector `<#>` (negative inner product, cheapest op) or `<=>` interchangeably; index with `vector_ip_ops`. EmbeddingGemma is the exception: load via `AutoModel`/`AutoTokenizer`; the ONNX graph already outputs pooled, normalized `sentence_embedding` — do not re-pool. If you MRL-truncate (768 → 256), re-normalize after slicing. https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/pipelines/feature-extraction.js · https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX

**Batch ingestion in bounded, length-sorted chunks.** The pipeline accepts `string[]` and tokenizes with `padding: true, truncation: true` — every sequence pads to the longest in the batch. Sort postings by approximate length first, then batch 16–64 on CPU: bigger batches inflate activation memory (scales with batch × seq²) for little throughput gain. One ORT session; run batches sequentially, not `Promise.all`.

**Own the cache.** Default cache is `./node_modules/@huggingface/transformers/.cache/` — wiped by `npm ci`. Set `env.cacheDir = '.cache/transformers'` (gitignored) before first pipeline call. For production: pre-download via a `node scripts/download-models.ts` step, then `env.allowRemoteModels = false`. v4's `ModelRegistry` gives preflight control: `get_pipeline_files`, `get_file_metadata` (download size), `is_pipeline_cached`, `get_available_dtypes` — check the latter before pinning a dtype; e.g. `onnx-community/all-MiniLM-L6-v2-ONNX` ships fp32/fp16/q4/q4f16 but **no q8**. https://huggingface.co/docs/transformers.js/en/tutorials/node · https://github.com/huggingface/transformers.js/releases/tag/4.0.0

**Next.js needs zero config for server-side use.** `@huggingface/transformers` and `onnxruntime-node` are in Next.js's built-in `serverExternalPackages` list — no webpack aliases, no manual opt-out. Embedding routes must run on the Node runtime (the default for Route Handlers), never `runtime = 'edge'`. Optionally warm the singleton at boot from `instrumentation.ts`. https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages

**Memory budget.** Rule of thumb: weights size + ~150–300 MB (Node + ORT session + tokenizer + activation buffers). MiniLM-class fp32 → ~300–400 MB RSS; EmbeddingGemma q4 → ~500 MB–1 GB. Fine on a dev box or container; tight on small serverless instances — keep batch sizes modest there and prefer the 384-dim models.

## Pitfalls
- **Installing `@xenova/transformers`** — old tutorials still link it; it's frozen at v2 and gets no model/runtime updates. The package is `@huggingface/transformers`.
- **`experimental.serverComponentsExternalPackages`** in copied Next.js configs — renamed to top-level `serverExternalPackages` in Next 15, and unnecessary for this package anyway (auto-externalized).
- **Webpack alias `'onnxruntime-node$': false`** from the client-side tutorial applied to a server build — it disables the native CPU backend. That alias is for browser bundles only.
- **Forgetting `pooling`/`normalize`** — defaults give you per-token embeddings, not a sentence vector; similarity scores will be garbage.
- **Mixing dtypes across ingestion and query** — q8/q4 quantization shifts vectors; pick one dtype and hard-code it next to the model id. Note v4 default resolves to fp32 on Node (`cpu` device), q8 only on `wasm` — v3-era code that assumed q8 defaults now silently loads 4x bigger weights. https://github.com/huggingface/transformers.js/blob/main/packages/transformers/src/utils/dtypes.js
- **Silent truncation at 512 tokens** — long HN postings get cut mid-text by MiniLM-class models. Chunk + average, or use EmbeddingGemma's 2K window.
- **Concurrent first-load across processes** (e.g. parallel Inngest steps on a cold cache) can fail mid-download. Pre-download in CI/setup, not lazily. https://github.com/huggingface/transformers.js/issues/1544
- **EmbeddingGemma specifics**: fp16/q4f16 unsupported (activations overflow — use fp32/q8/q4); query and document prefixes are mandatory (`"task: search result | query: "` vs `"title: none | text: "`); asymmetric — never embed queries with the document prefix.
- **Re-instantiating pipelines per request or per HMR cycle** — memory climbs by a full model copy each time; the `globalThis` singleton is not optional in dev.

## Version notes
- Current: **`@huggingface/transformers` 4.2.0** (2026-04-22, verified on the npm registry). v4.0.0 landed 2026-03-30: new C++ WebGPU runtime (WebGPU now works in Node/Bun/Deno), `ModelRegistry` API, `env.logLevel`, `env.fetch`, esbuild builds, pnpm monorepo; tokenizers split into standalone `@huggingface/tokenizers`. New dtypes: q1/q2 (+f16 variants) since 4.1.0. https://github.com/huggingface/transformers.js/releases
- No breaking API changes for the `pipeline()`/feature-extraction path from v3 → v4; v3 code generally runs as-is. Default device in Node is `cpu`, default dtype fp32.
- Next.js ≥15 (this repo: 16.2.9): `serverExternalPackages` is stable and includes `@huggingface/transformers` + `onnxruntime-node` by default.
- Install for this repo: `npm i @huggingface/transformers` (one dependency; ships its own ORT binaries). Node 18+ required.
```

---

## Verification notes (for reviewer, not part of the doc)
- npm registry queried directly: latest = 4.2.0 (2026-04-22).
- Pipeline defaults quoted from v4 source (`packages/transformers/src/pipelines/feature-extraction.js`): pooling `'none'`, normalize `false`, tokenizer `padding: true, truncation: true`.
- dtype/device defaults from `src/utils/dtypes.js` + `src/utils/devices.js`: Node → `cpu` → fp32; `wasm` → q8.
- Model weight sizes read from HF Hub API file trees (exact MB figures above).
- Next.js auto-externalization confirmed in official docs package list.
