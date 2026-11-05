import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, sendJson } from "./api";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  htmlLink: string | null;
  editable: boolean;
  recurring: boolean;
};

/** What the event editor sends. All-day: YYYY-MM-DD (end exclusive). Timed: ISO date-time. */
export type EventInput = {
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  start: string;
  end: string;
  timeZone: string;
};

export type EmailSummary = {
  id: string;
  subject: string;
  from: string | null;
  date: string | null;
  snippet: string;
  unread: boolean;
};

export function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useTodayEvents() {
  const { start, end } = todayRange();
  return useQuery({
    queryKey: ["google", "calendar", start],
    queryFn: () =>
      getJson<CalendarEvent[]>(
        `/api/google/calendar/today?${new URLSearchParams({ start, end })}`,
      ),
    retry: false,
  });
}

export function useRecentEmails() {
  return useQuery({
    queryKey: ["google", "gmail", "recent"],
    queryFn: () => getJson<EmailSummary[]>("/api/google/gmail/recent"),
    retry: false,
  });
}

export function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return "All day";
  return new Date(event.start).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Jane Doe <jane@example.com>" -> "Jane Doe" */
export function senderName(from: string | null) {
  if (!from) return "Unknown sender";
  const match = from.match(/^\s*"?([^"<]+?)"?\s*<.+>\s*$/);
  return match ? match[1] : from;
}

/**
 * Opens a message in Gmail on the web. `authuser` picks the right Google account when
 * several are signed in to the browser.
 */
export function gmailUrl(messageId: string, accountEmail?: string) {
  const account = accountEmail ? `?authuser=${encodeURIComponent(accountEmail)}` : "";
  return `https://mail.google.com/mail/${account}#all/${messageId}`;
}

const calendarKey = ["google", "calendar"];

function useCalendarMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKey }),
  });
}

export const useCreateEvent = () =>
  useCalendarMutation((input: EventInput) => sendJson<CalendarEvent>("/api/google/calendar/events", "POST", input));

export const useUpdateEvent = () =>
  useCalendarMutation(({ id, input }: { id: string; input: EventInput }) =>
    sendJson<CalendarEvent>(`/api/google/calendar/events/${encodeURIComponent(id)}`, "PATCH", input),
  );

export const useDeleteEvent = () =>
  useCalendarMutation((id: string) =>
    sendJson<void>(`/api/google/calendar/events/${encodeURIComponent(id)}`, "DELETE"),
  );
