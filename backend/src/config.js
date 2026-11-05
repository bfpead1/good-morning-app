import { z } from "zod";

/** Optional env var where a blank `KEY=` line counts as unset. */
const optional = (schema) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const env = z
  .object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().default("development"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    // Goes through the Vite proxy in dev so the session cookie stays on the frontend's origin.
    GOOGLE_REDIRECT_URI: z.url().default("http://localhost:5173/api/auth/google/callback"),
    FRONTEND_URL: z.url().default("http://localhost:5173"),
    // Optional: enables AI features (daily plan, workout generator). Free tier at console.groq.com.
    GROQ_API_KEY: optional(z.string()),
    // Must support strict structured outputs; see https://console.groq.com/docs/structured-outputs
    GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
    // gpt-oss models: low | medium | high. Lower uses fewer tokens of the free-tier budget.
    GROQ_REASONING_EFFORT: optional(z.enum(["low", "medium", "high"])),
    // Timezone for "today" and the morning job.
    APP_TIMEZONE: z.string().min(1).default("America/Denver"),
    // Local time (24h HH:MM) the daily plan is generated each morning.
    PLAN_JOB_TIME: z.string().regex(/^\d{2}:\d{2}$/).default("05:30"),
    // Optional: when both are set, data lives in Supabase instead of backend/data/db.json.
    SUPABASE_URL: optional(z.url()),
    SUPABASE_SERVICE_ROLE_KEY: optional(z.string()),
    // Optional: comma-separated Google emails allowed to sign in. Blank lets any Google account in.
    ALLOWED_EMAILS: optional(z.string()),
  })
  .refine((e) => !e.SUPABASE_URL === !e.SUPABASE_SERVICE_ROLE_KEY, {
    message: "Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither",
  })
  // Hosts like Render wipe the disk on every restart, so the JSON file store would lose data.
  .refine((e) => e.NODE_ENV !== "production" || e.SUPABASE_URL, {
    message: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production",
  })
  .safeParse(process.env);

if (!env.success) {
  console.error("Invalid environment configuration. Copy .env.example to .env and fill it in.");
  console.error(z.prettifyError(env.error));
  process.exit(1);
}

export const config = {
  port: env.data.PORT,
  isProduction: env.data.NODE_ENV === "production",
  sessionSecret: env.data.SESSION_SECRET,
  google: {
    clientId: env.data.GOOGLE_CLIENT_ID,
    clientSecret: env.data.GOOGLE_CLIENT_SECRET,
    redirectUri: env.data.GOOGLE_REDIRECT_URI,
  },
  frontendUrl: env.data.FRONTEND_URL,
  allowedEmails: env.data.ALLOWED_EMAILS
    ? env.data.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : null,
  aiEnabled: Boolean(env.data.GROQ_API_KEY),
  groq: {
    apiKey: env.data.GROQ_API_KEY,
    model: env.data.GROQ_MODEL,
    reasoningEffort: env.data.GROQ_REASONING_EFFORT ?? "low",
  },
  timeZone: env.data.APP_TIMEZONE,
  planJobTime: env.data.PLAN_JOB_TIME,
  supabase: env.data.SUPABASE_URL
    ? { url: env.data.SUPABASE_URL, serviceRoleKey: env.data.SUPABASE_SERVICE_ROLE_KEY }
    : null,
};
