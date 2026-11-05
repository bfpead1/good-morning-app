// The AI daily plan (generated server-side with Groq). Loading the page only reads the saved
// plan; Groq is called by the morning job or when you press Generate/Regenerate.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, getJson, sendJson } from "./api";

export type BlockType = "class" | "task" | "workout" | "study" | "break";

export type DailyPlan = {
  date: string;
  generatedAt: string;
  plan: {
    priorities: { title: string; reason: string; estimated_minutes: number }[];
    time_blocks: { start: string; end: string; label: string; type: BlockType }[];
    email_actions: { email_id: string; suggestion: string; subject: string | null; from: string | null }[];
    note: string;
  };
};

const planKey = ["plan", "today"];

/** Today's saved plan, or null if none has been generated yet. */
export function useTodayPlan() {
  return useQuery({
    queryKey: planKey,
    queryFn: async () => {
      try {
        return await getJson<DailyPlan>("/api/plan/today");
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    retry: false,
  });
}

/** Generates (or regenerates) today's plan. Takes 5–30 seconds. */
export function useGeneratePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson<DailyPlan>("/api/plan/generate", "POST"),
    onSuccess: (plan) => queryClient.setQueryData(planKey, plan),
  });
}

/** "13:30" -> "1:30 PM" */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** User-facing explanation for a failed AI request. */
export function aiMessage(error: Error | null, fallback = "Couldn't generate your plan right now.") {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === "ai_not_configured") return "Add a free Groq API key as GROQ_API_KEY in backend/.env to turn on AI planning.";
  if (code === "ai_bad_key") return "Groq rejected the API key. Check GROQ_API_KEY in backend/.env.";
  if (code === "ai_rate_limited") {
    const wait = error instanceof ApiError ? error.retryAfter : null;
    return `Groq's free-tier limit was reached. Try again ${wait ? `in about ${formatWait(wait)}` : "in a minute"}.`;
  }
  if (code === "ai_invalid_output") return `${fallback} The AI's answer didn't pass the checks, even after a retry.`;
  if (code === "google_reauth_required") return "Google access expired. Reconnect in Settings.";
  return fallback;
}

function formatWait(seconds: number) {
  if (seconds < 90) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes < 90 ? `${minutes} minutes` : `${Math.ceil(minutes / 60)} hours`;
}
