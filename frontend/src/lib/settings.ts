import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, sendJson } from "./api";
import type { Weekday } from "./workout";

export type Location = { latitude: number; longitude: number; label: string };

export type Settings = {
  workoutCycleStart: string;
  scripturePace: { daysPerWeek: number; minutesPerSession: number };
  scriptureLearningMode: boolean;
  /** A workout picked for one specific day, instead of the scheduled one. */
  workoutOverride: { date: string; weekIndex: number; weekday: Weekday } | null;
  /** What the AI workout generator designs around. */
  workoutProfile: { goals: string; equipment: string; daysPerWeek: number };
  location: Location | null;
  features: { ai: boolean; database: "json" | "supabase" };
};

export type SettingsPatch = Partial<Omit<Settings, "features">>;

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => getJson<Settings>("/api/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => sendJson<Settings>("/api/settings", "PATCH", patch),
    onSuccess: (settings) => queryClient.setQueryData(["settings"], settings),
  });
}
