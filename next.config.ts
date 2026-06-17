import { type NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // @huggingface/transformers loads onnxruntime-node, a native addon. Keep it out
  // of the webpack bundle (loaded as a runtime external)…
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  // …and force-include its native shared library in every server function's file
  // trace, or Vercel's serverless bundle is missing libonnxruntime.so.1 and any
  // route importing the embeddings chain 500s.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*"],
  },
};

export default nextConfig;
