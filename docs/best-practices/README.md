# Best-practices references

Researched 2026-06-10 against live official docs (versions verified on npm). Read the matching doc **before** implementing its area — these exist to override stale training-data patterns.

| Doc | Read before touching |
|-----|----------------------|
| [nextjs-app-router.md](nextjs-app-router.md) | Any page, layout, Server Action, caching, error boundary |
| [drizzle-neon.md](drizzle-neon.md) | Schema, migrations, db client, queries |
| [groq-llm-api.md](groq-llm-api.md) | LLM extraction calls (`lib/llm/`) |
| [hn-api-ingestion.md](hn-api-ingestion.md) | Thread fetching, diffing, ingest CLI |
| [pgvector-hybrid-search.md](pgvector-hybrid-search.md) | Embeddings storage, HNSW, hybrid/RRF queries |
| [local-embeddings.md](local-embeddings.md) | transformers.js embedding pipeline |
| [inngest-pipelines.md](inngest-pipelines.md) | Inngest functions, retries, fan-out, dead letters |
| [agent-tool-loops.md](agent-tool-loops.md) | The agent loop, persistence, SSE trace |
| [ai-security.md](ai-security.md) | Anything where posting text meets a prompt; tool definitions |
| [rate-limiting-upstash.md](rate-limiting-upstash.md) | Rate limiting AI endpoints |
| [mcp-server-typescript.md](mcp-server-typescript.md) | The MCP server |

Key cross-cutting rules: model is `openai/gpt-oss-120b` (json_schema strict — llama-3.3 does NOT support it); zod-validate every LLM output before it touches the DB or a tool; `@huggingface/transformers` (never `@xenova`); posting text is hostile input — spotlight it, never put instructions outside the system message.
