import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getJson, localDateString, sendJson } from "./api";

// Mirrors backend/src/workout/planSchema.js
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type PlanItem = { name: string; detail: string | null; amount: string | null; swap: boolean };
export type PlanSection = {
  title: string;
  kind: "exercises" | "hiit" | "activities" | "percentages";
  items: PlanItem[];
};
export type DayType = "push" | "legs" | "swim" | "hike" | "rest" | "strength";
export type PlanDay = {
  weekday: Weekday;
  title: string;
  type: DayType;
  durationMinutes: number;
  sections: PlanSection[];
  note: string | null;
};
export type PlanWeek = { label: string; banner: string | null; days: PlanDay[] };
export type WorkoutPlan = { name: string; weeks: PlanWeek[] };

export type ActivePlan = {
  plan: WorkoutPlan;
  source: "default" | "ai" | "manual";
  summary: string | null;
  updatedAt: string | null;
};

export type BodyMetric = {
  id: string;
  measuredOn: string;
  weightLbs: number | null;
  muscleMassLbs: number | null;
  bodyFatPct: number | null;
  note: string | null;
  createdAt: string;
};
export type NewBodyMetric = Omit<BodyMetric, "id" | "createdAt">;

export type Suggestion = {
  id: string;
  kind: "edit_day" | "new_plan";
  /** For edit_day: which day was rewritten. */
  target: { weekIndex: number; weekday: Weekday } | null;
  request: string | null;
  summary: string;
  changes: { change: string; why: string }[];
  plan: WorkoutPlan;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
};

export const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const JS_DAY_TO_WEEKDAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Which week of the rotation `date` falls in, given the Monday Week 1 started. */
export function rotationWeekIndex(plan: WorkoutPlan, cycleStart: string, date = new Date()) {
  const [y, m, d] = cycleStart.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weeks = Math.floor(Math.round((today.getTime() - start.getTime()) / MS_PER_DAY) / 7);
  const n = plan.weeks.length;
  return ((weeks % n) + n) % n;
}

/**
 * Today's workout: the scheduled rotation day, unless a different day was picked for today.
 * Mirrors backend/src/workout/schedule.js.
 */
export function todaysWorkout(
  plan: WorkoutPlan,
  cycleStart: string,
  override: { date: string; weekIndex: number; weekday: Weekday } | null = null,
  date = new Date(),
) {
  if (override && override.date === localDateString(date)) {
    const week = plan.weeks[override.weekIndex];
    const day = week?.days.find((d) => d.weekday === override.weekday);
    if (week && day) return { weekIndex: override.weekIndex, week, day, overridden: true };
  }
  const weekIndex = rotationWeekIndex(plan, cycleStart, date);
  const week = plan.weeks[weekIndex];
  const weekday = JS_DAY_TO_WEEKDAY[date.getDay()];
  const day = week.days.find((d) => d.weekday === weekday) ?? null;
  return { weekIndex, week, day, overridden: false };
}

export function itemCount(day: PlanDay) {
  return day.sections.reduce((n, s) => n + s.items.length, 0);
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useWorkoutPlan() {
  return useQuery({ queryKey: ["workout", "plan"], queryFn: () => getJson<ActivePlan>("/api/workout/plan") });
}

export function useResetPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson<ActivePlan>("/api/workout/plan/reset", "POST"),
    onSuccess: (plan) => queryClient.setQueryData(["workout", "plan"], plan),
  });
}

export function useBodyMetrics() {
  return useQuery({ queryKey: ["workout", "metrics"], queryFn: () => getJson<BodyMetric[]>("/api/workout/metrics") });
}

export function useAddBodyMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: NewBodyMetric) => sendJson<BodyMetric>("/api/workout/metrics", "POST", entry),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workout", "metrics"] }),
  });
}

export function useDeleteBodyMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendJson<void>(`/api/workout/metrics/${id}`, "DELETE"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workout", "metrics"] }),
  });
}

export function usePendingSuggestion() {
  return useQuery({
    queryKey: ["workout", "suggestion"],
    queryFn: () => getJson<Suggestion | null>("/api/workout/suggestions/latest"),
  });
}

export type GenerateRequest =
  | { mode: "edit_day"; weekIndex: number; weekday: Weekday; notes: string }
  | { mode: "new_plan"; notes: string };

/** Asks the AI to rewrite one day or design a new plan. The result is a pending suggestion. */
export function useGenerateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: GenerateRequest) =>
      sendJson<Suggestion>("/api/workout/generate", "POST", { ...req, today: localDateString() }),
    onSuccess: (s) => queryClient.setQueryData(["workout", "suggestion"], s),
  });
}

export function useResolveSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "dismiss" }) => {
      if (action === "accept") {
        const plan = await sendJson<ActivePlan>(`/api/workout/suggestions/${id}/accept`, "POST");
        queryClient.setQueryData(["workout", "plan"], plan);
      } else {
        await sendJson<void>(`/api/workout/suggestions/${id}/dismiss`, "POST");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["workout", "suggestion"], null);
      // Accepting a new plan resets the rotation start on the server.
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ─── Daily check-offs ──────────────────────────────────────────────────────

export type WorkoutLog = {
  date: string;
  weekLabel: string;
  dayTitle: string;
  completed: string[];
  totalItems: number;
  updatedAt: string;
};

/** Stable key for one checkable item: survives reordering, changes if the item is renamed. */
export function itemKey(section: PlanSection, item: PlanItem) {
  return `${section.title}::${item.name}`;
}

const logsKey = ["workout", "logs"];

export function useWorkoutLogs(days = 28) {
  // Fixed for the component's lifetime so the query key stays stable.
  const [sinceDate] = useState(() => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return localDateString(since);
  });
  return useQuery({
    queryKey: [...logsKey, sinceDate],
    queryFn: () => getJson<WorkoutLog[]>(`/api/workout/logs?since=${sinceDate}`),
  });
}

/** Saves a day's check-offs, updating every cached log list immediately. */
export function useSaveWorkoutLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, ...log }: Omit<WorkoutLog, "updatedAt">) =>
      sendJson<WorkoutLog>(`/api/workout/logs/${date}`, "PUT", log),
    onMutate: async (log) => {
      await queryClient.cancelQueries({ queryKey: logsKey });
      const previous = queryClient.getQueriesData<WorkoutLog[]>({ queryKey: logsKey });
      const optimistic = { ...log, updatedAt: new Date().toISOString() };
      queryClient.setQueriesData<WorkoutLog[]>({ queryKey: logsKey }, (logs = []) =>
        [optimistic, ...logs.filter((l) => l.date !== log.date)].sort((a, b) => b.date.localeCompare(a.date)),
      );
      return { previous };
    },
    onError: (_err, _log, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: logsKey }),
  });
}
