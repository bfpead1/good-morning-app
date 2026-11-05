import { useEffect, useState } from "react";
import { ApiError, localDateString } from "../lib/api";
import {
  type CalendarEvent,
  type EventInput,
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
} from "../lib/google";
import { PrimaryButton, SecondaryButton } from "./PrimaryButton";

/** "YYYY-MM-DDTHH:MM" in local time, the format <input type="datetime-local"> uses. */
function toLocalInput(date: Date) {
  return `${localDateString(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return localDateString(new Date(y, m - 1, d + days));
}

type Form = {
  title: string;
  allDay: boolean;
  start: string; // datetime-local
  end: string; // datetime-local
  startDate: string; // all-day, inclusive
  endDate: string; // all-day, inclusive
  location: string;
  description: string;
};

function initialForm(event: CalendarEvent | null): Form {
  if (event) {
    const timedStart = event.allDay ? null : new Date(event.start);
    const timedEnd = event.allDay ? null : new Date(event.end);
    return {
      title: event.title === "(No title)" ? "" : event.title,
      allDay: event.allDay,
      start: timedStart ? toLocalInput(timedStart) : `${event.start}T09:00`,
      end: timedEnd ? toLocalInput(timedEnd) : `${event.start}T10:00`,
      startDate: event.allDay ? event.start : localDateString(timedStart!),
      // Google's all-day end date is exclusive; show the last day instead.
      endDate: event.allDay ? addDays(event.end, -1) : localDateString(timedEnd!),
      location: event.location ?? "",
      description: event.description ?? "",
    };
  }
  // New event: next whole hour, one hour long.
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    title: "",
    allDay: false,
    start: toLocalInput(start),
    end: toLocalInput(end),
    startDate: localDateString(start),
    endDate: localDateString(start),
    location: "",
    description: "",
  };
}

function toInput(form: Form): EventInput | string {
  if (!form.title.trim()) return "Add a title.";
  const base = {
    title: form.title.trim(),
    location: form.location.trim() || null,
    description: form.description.trim() || null,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  if (form.allDay) {
    if (form.endDate < form.startDate) return "The end date is before the start date.";
    return { ...base, allDay: true, start: form.startDate, end: addDays(form.endDate, 1) };
  }
  const start = new Date(form.start);
  const end = new Date(form.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Pick a start and end time.";
  if (end <= start) return "The end time must be after the start time.";
  return { ...base, allDay: false, start: start.toISOString(), end: end.toISOString() };
}

function errorMessage(err: unknown) {
  const code = err instanceof ApiError ? err.code : undefined;
  if (code === "event_not_editable") return "You can't edit this event — someone else organizes it.";
  if (code === "event_not_found") return "This event no longer exists.";
  if (code === "calendarEdit_not_connected") return "Calendar editing isn't allowed yet. Grant access in Settings.";
  if (code === "google_reauth_required") return "Google access expired. Reconnect in Settings.";
  return "Couldn't save to Google Calendar. Try again.";
}

const inputClass =
  "w-full rounded-button border border-card-border bg-page/30 px-3 py-2 text-[14px] text-ink";

/** Bottom sheet for adding (event = null) or editing an event. */
export function EventEditor({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  const [form, setForm] = useState(() => initialForm(event));
  const [error, setError] = useState<string | null>(null);
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const remove = useDeleteEvent();
  const busy = create.isPending || update.isPending || remove.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const input = toInput(form);
    if (typeof input === "string") return setError(input);
    setError(null);
    const options = { onSuccess: onClose, onError: (err: unknown) => setError(errorMessage(err)) };
    if (event) update.mutate({ id: event.id, input }, options);
    else create.mutate(input, options);
  }

  function destroy() {
    if (!event || !confirm(`Delete “${event.title}” from your Google Calendar?`)) return;
    remove.mutate(event.id, { onSuccess: onClose, onError: (err) => setError(errorMessage(err)) });
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40"
      onClick={onClose}
      role="presentation"
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={event ? "Edit event" : "New event"}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] bg-card p-6 pb-[max(24px,env(safe-area-inset-bottom))]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-medium text-ink">
            {event ? "Edit event" : "New event"}
          </h2>
          <button type="button" onClick={onClose} className="text-[14px] font-semibold text-ink-soft-62">
            Cancel
          </button>
        </div>

        <input
          autoFocus
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Title"
          maxLength={300}
          className={`${inputClass} mb-3 text-[16px]`}
        />

        <label className="mb-3 flex items-center gap-2 text-[14px] text-ink">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => set("allDay", e.target.checked)}
            className="h-4 w-4 accent-[#1e2a38]"
          />
          All day
        </label>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-ink-soft-62">Starts</span>
            {form.allDay ? (
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputClass} />
            ) : (
              <input type="datetime-local" value={form.start} onChange={(e) => set("start", e.target.value)} className={inputClass} />
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-ink-soft-62">Ends</span>
            {form.allDay ? (
              <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={inputClass} />
            ) : (
              <input type="datetime-local" value={form.end} onChange={(e) => set("end", e.target.value)} className={inputClass} />
            )}
          </label>
        </div>

        <input
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="Location"
          maxLength={500}
          className={`${inputClass} mb-3`}
        />
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Notes"
          rows={3}
          maxLength={5000}
          className={`${inputClass} mb-3`}
        />

        {event?.recurring && (
          <p className="mb-3 text-[12.5px] text-ink-soft-55">
            This is a repeating event. Changes apply to this occurrence only.
          </p>
        )}
        {error && <p className="mb-3 text-[13.5px] text-ink">{error}</p>}

        <PrimaryButton type="submit" disabled={busy}>
          {create.isPending || update.isPending ? "Saving…" : "Save to Google Calendar"}
        </PrimaryButton>
        {event && (
          <SecondaryButton type="button" onClick={destroy} disabled={busy} className="mt-3">
            {remove.isPending ? "Deleting…" : "Delete event"}
          </SecondaryButton>
        )}
        {event?.htmlLink && (
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-center text-[13px] font-semibold text-ink-soft-62"
          >
            Open in Google Calendar ↗
          </a>
        )}
      </form>
    </div>
  );
}
