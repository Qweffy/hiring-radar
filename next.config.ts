import { type NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // @huggingface/transformers loads onnxruntime-node, a native addon — keep it out
  // of the webpack bundle (loaded as a runtime external). The native lib is absent
  // on serverless runtimes, where embeddings are lazily imported and degrade to
  // full-text search (lib/embeddings.ts + lib/search/engine.ts) rather than crash.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
