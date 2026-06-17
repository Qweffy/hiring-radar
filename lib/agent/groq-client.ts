import Groq from "groq-sdk";

/**
 * Groq client for the agent loop. Mirrors lib/llm/extract.ts (lazy singleton,
 * fail fast if the key is missing). The agent uses tool calling, not strict
 * structured outputs, but the same OpenAI-compatible client serves both.
 */

const DEFAULT_MODEL = "openai/gpt-oss-120b";

/** The tool-use model — env override, else the recommended gpt-oss-120b. */
export const agentModel = (): string => process.env.GROQ_MODEL ?? DEFAULT_MODEL;

let _client: Groq | null = null;

export function groqClient(): Groq {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not set — copy .env.example to .env.local and fill it in.",
      );
    }
    _client = new Groq({ apiKey });
  }
  return _client;
}
