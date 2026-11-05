// Minimal Groq client (OpenAI-compatible Chat Completions over fetch).
// The API key is read from config only here and is never logged or sent to the browser.
import { config } from "../config.js";
import { toStrictJsonSchema } from "./jsonSchema.js";

const BASE_URL = "https://api.groq.com/openai/v1";
// Wait out a 429 automatically only when Groq asks for a short pause.
const MAX_AUTO_WAIT_SECONDS = 10;

export class AiError extends Error {
  /**
   * code: ai_not_configured | ai_bad_key | ai_rate_limited | ai_invalid_output | ai_unavailable
   * retryAfter: seconds, for ai_rate_limited
   */
  constructor(code, message, { retryAfter = null } = {}) {
    super(message);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(res) {
  const seconds = Number(res.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

async function chatCompletion(body, { allowWait = true } = {}) {
  if (!config.groq.apiKey) throw new AiError("ai_not_configured", "GROQ_API_KEY is not set");

  let res;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.groq.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    throw new AiError("ai_unavailable", `Couldn't reach Groq: ${err.message}`);
  }

  if (res.status === 429) {
    const retryAfter = parseRetryAfter(res);
    if (allowWait && retryAfter !== null && retryAfter <= MAX_AUTO_WAIT_SECONDS) {
      await sleep(retryAfter * 1000);
      return chatCompletion(body, { allowWait: false });
    }
    throw new AiError("ai_rate_limited", "Groq's free-tier rate limit was reached", { retryAfter });
  }
  if (res.status === 401 || res.status === 403) {
    throw new AiError("ai_bad_key", "Groq rejected the API key");
  }
  if (!res.ok) {
    // Groq's error body describes the problem (bad schema, model unavailable). It never contains the key.
    const detail = await res.text().catch(() => "");
    console.error(`Groq error ${res.status}:`, detail.slice(0, 500));
    throw new AiError("ai_unavailable", `Groq returned HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * One structured-output request, validated with Zod. On invalid output it retries once,
 * telling the model what was wrong. `validate(result)` can add business rules
 * (e.g. no overlapping blocks) by returning an error string.
 */
export async function generateJson({ name, system, user, schema, validate, maxTokens = 4000 }) {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const jsonSchema = toStrictJsonSchema(schema);

  let lastProblem = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const data = await chatCompletion({
      model: config.groq.model,
      messages,
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: jsonSchema } },
      max_completion_tokens: maxTokens,
      ...(config.groq.model.startsWith("openai/gpt-oss")
        ? { reasoning_effort: config.groq.reasoningEffort, include_reasoning: false }
        : {}),
    });

    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? "";
    if (choice?.finish_reason === "length") {
      lastProblem = "The response was cut off before it finished. Be more concise.";
    } else {
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = undefined;
        lastProblem = "The response was not valid JSON.";
      }
      if (parsed !== undefined) {
        const result = schema.safeParse(parsed);
        if (!result.success) {
          lastProblem = `The JSON did not match the schema: ${result.error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("; ")}`;
        } else {
          const ruleProblem = validate?.(result.data);
          if (!ruleProblem) return result.data;
          lastProblem = ruleProblem;
        }
      }
    }

    console.warn(`Groq ${name} attempt ${attempt} invalid: ${lastProblem}`);
    if (attempt === 1) {
      messages.push(
        { role: "assistant", content: content || "(empty)" },
        { role: "user", content: `That response was rejected: ${lastProblem} Return a corrected response that follows every rule.` },
      );
    }
  }
  throw new AiError("ai_invalid_output", lastProblem ?? "The model's response was invalid");
}

/** Express helper: turns AiError into a JSON response the frontend understands. */
export function sendAiError(res, err) {
  if (!(err instanceof AiError)) throw err;
  const status = err.code === "ai_not_configured" || err.code === "ai_bad_key" ? 503 : err.code === "ai_rate_limited" ? 429 : 502;
  res.status(status).json({ error: err.code, message: err.message, retryAfter: err.retryAfter });
}
