import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, getJson, sendJson } from "./api";

export type CanvasStatus =
  | { connected: false }
  | { connected: true; baseUrl: string; accountName: string | null; connectedAt?: string };

export type CourseworkItem = {
  id: string;
  title: string;
  course: string | null;
  type: string;
  dueAt: string | null;
  points: number | null;
  url: string | null;
  submitted: boolean;
  graded: boolean;
  late: boolean;
  missing: boolean;
  done: boolean;
};

export type MissingItem = Pick<CourseworkItem, "id" | "title" | "course" | "dueAt" | "points" | "url">;

const statusKey = ["canvas", "status"];
const upcomingKey = ["canvas", "upcoming"];

export function useCanvasStatus() {
  return useQuery({ queryKey: statusKey, queryFn: () => getJson<CanvasStatus>("/api/canvas/status") });
}

export function useCanvasUpcoming(enabled: boolean) {
  return useQuery({
    queryKey: upcomingKey,
    queryFn: () => getJson<{ upcoming: CourseworkItem[]; missing: MissingItem[] }>("/api/canvas/upcoming?days=7"),
    enabled,
    retry: false,
  });
}

export function useConnectCanvas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { baseUrl: string; token: string }) =>
      sendJson<CanvasStatus>("/api/canvas/connect", "POST", body),
    onSuccess: (status) => {
      queryClient.setQueryData(statusKey, status);
      queryClient.invalidateQueries({ queryKey: upcomingKey });
    },
  });
}

export function useDisconnectCanvas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson<void>("/api/canvas/connect", "DELETE"),
    onSuccess: () => {
      queryClient.setQueryData(statusKey, { connected: false });
      queryClient.removeQueries({ queryKey: upcomingKey });
    },
  });
}

export function canvasMessage(error: Error | null) {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === "canvas_auth_failed") return "Canvas rejected the access token. It may have expired or been deleted; reconnect in Settings.";
  if (code === "canvas_bad_url") return error!.message;
  if (code === "canvas_unavailable") return "Couldn't reach Canvas right now.";
  if (code === "invalid_request") return error!.message;
  return "Something went wrong talking to Canvas.";
}

/** "Today 11:59 PM", "Tomorrow 9:00 AM", "Thu Oct 16, 11:59 PM" */
export function formatDue(iso: string | null) {
  if (!iso) return "No due date";
  const due = new Date(iso);
  const time = due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dayDiff = Math.round(
    (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() -
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) /
      86_400_000,
  );
  if (dayDiff === 0) return `Today ${time}`;
  if (dayDiff === 1) return `Tomorrow ${time}`;
  if (dayDiff === -1) return `Yesterday ${time}`;
  return `${due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}
