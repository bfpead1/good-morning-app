import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { config } from "../config.js";

export const MODEL = "claude-opus-5-5";

// Reads ANTHROPIC_API_KEY from the environment. Only constructed when AI is enabled.
const client = config.aiEnabled ? new Anthropic() : null;

export class AiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * One Claude call whose reply is validated against a Zod schema.
 * Throws AiError("ai_not_configured" | "ai_refused" | "ai_truncated" | "ai_invalid_output").
 */
export async function generateStructured({ system, prompt, schema, effort = "medium", maxTokens = 16000 }) {
  if (!client) throw new AiError("ai_not_configured", "ANTHROPIC_API_KEY is not set");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort, format: betaZodOutputFormat(schema) },
    // If a safety classifier declines, the API retries on a suitable model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  if (response.stop_reason === "refusal") {
    throw new AiError("ai_refused", response.stop_details?.explanation ?? "Claude declined this request");
  }
  if (response.stop_reason === "max_tokens") {
    throw new AiError("ai_truncated", "Claude's reply was cut off before it finished");
  }
  if (!response.parsed_output) {
    throw new AiError("ai_invalid_output", "Claude's reply didn't match the expected format");
  }
  return response.parsed_output;
}

/** Express helper: turns AiError into a JSON response the frontend understands. */
export function sendAiError(res, err) {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic rejected the API key:", err.message);
    return res.status(503).json({ error: "ai_bad_key", message: "The Anthropic API key was rejected" });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(503).json({ error: "ai_busy", message: "Claude is rate limited; try again shortly" });
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`Anthropic API error ${err.status}:`, err.message);
    return res.status(502).json({ error: "ai_unavailable", message: "Claude is unavailable right now" });
  }
  if (!(err instanceof AiError)) throw err;
  const status = err.code === "ai_not_configured" ? 503 : 502;
  res.status(status).json({ error: err.code, message: err.message });
}
