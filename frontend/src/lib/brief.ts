import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, localDateString, sendJson } from "./api";
import { todayRange } from "./google";
import { nextSession, useScriptureProgress } from "./scripture";
import { useSettings } from "./settings";
import { todaysWorkout, useWorkoutPlan } from "./workout";

export type PlanBlockKind = "fixed" | "priority" | "study" | "workout" | "neutral";

export type DailyBrief = {
  date: string;
  createdAt: string;
  acceptedAt: string | null;
  brief: {
    priorities: { title: string; reason: string }[];
    importantEmails: { emailId: string; summary: string; subject: string; from: string | null }[];
    planBlocks: { start: string; end: string; title: string; kind: PlanBlockKind }[];
    rationale: string;
    focusMinutes: number;
  };
};

export type BriefContext = {
  workout: { title: string; durationMinutes: number } | null;
  scriptureMinutes: number;
};

function requestBody(context: BriefContext, regenerate: boolean) {
  return {
    date: localDateString(),
    ...todayRange(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    regenerate,
    ...context,
  };
}

const briefKey = () => ["brief", localDateString()];

/**
 * Today's brief. The first request of the day makes Claude generate it (~10–60s);
 * after that it's served from the database. Pass `context` once workout/scripture are known.
 */
export function useDailyBrief(context: BriefContext | null, enabled = true) {
  return useQuery({
    queryKey: briefKey(),
    queryFn: () => sendJson<DailyBrief>("/api/brief/today", "POST", requestBody(context!, false)),
    enabled: enabled && context !== null,
    retry: false,
    staleTime: Infinity,
  });
}

export function useRegenerateBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (context: BriefContext) =>
      sendJson<DailyBrief>("/api/brief/today", "POST", requestBody(context, true)),
    onSuccess: (brief) => queryClient.setQueryData(briefKey(), brief),
  });
}

export function useAcceptBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson<DailyBrief>("/api/brief/accept", "POST", { date: localDateString() }),
    onSuccess: (brief) => queryClient.setQueryData(briefKey(), brief),
  });
}

/** "13:30" -> "1:30 PM" */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Workout + scripture context for the brief, or null until all of it has loaded. */
export function useBriefContext(): BriefContext | null {
  const settings = useSettings();
  const plan = useWorkoutPlan();
  const progress = useScriptureProgress();
  if (!settings.data || !plan.data || !progress.data) return null;

  const { day } = todaysWorkout(plan.data.plan, settings.data.workoutCycleStart);
  const session = nextSession(progress.data, settings.data.scripturePace);
  return {
    workout: day && day.type !== "rest" ? { title: day.title, durationMinutes: day.durationMinutes } : null,
    scriptureMinutes: session?.minutes ?? 0,
  };
}

/** User-facing explanation for a failed Claude request. */
export function aiMessage(error: Error | null, fallback = "Claude couldn't plan your day right now.") {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === "ai_not_configured") return "Add an Anthropic API key to the backend to get daily priorities from Claude.";
  if (code === "ai_bad_key") return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in backend/.env.";
  if (code === "google_reauth_required") return "Google access expired. Reconnect in Settings.";
  if (code === "ai_busy") return "Claude is busy right now. Try again in a minute.";
  return fallback;
}

