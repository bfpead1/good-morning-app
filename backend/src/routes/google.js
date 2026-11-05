import { Router } from "express";
import { z } from "zod";
import { clientForUser, connectionsFromScope, isReauthError } from "../lib/google.js";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  fetchRecentEmails,
  updateEvent,
} from "../lib/googleData.js";
import { requireUser } from "../lib/requireUser.js";

export const googleRouter = Router();

export const dayRangeSchema = z
  .object({ start: z.coerce.date(), end: z.coerce.date() })
  .refine(({ start, end }) => end > start && end - start <= 2 * 24 * 60 * 60 * 1000);

googleRouter.use(requireUser, (req, _res, next) => {
  req.google = clientForUser(req.user);
  next();
});

function requireScope(name) {
  return (req, res, next) => {
    if (!connectionsFromScope(req.user.tokens.scope)[name]) {
      return res.status(403).json({ error: `${name}_not_connected` });
    }
    next();
  };
}

/** Wraps a handler so a revoked/expired Google grant becomes a clear 401 instead of a 500. */
function withReauth(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (isReauthError(err)) {
        return res.status(401).json({ error: "google_reauth_required" });
      }
      throw err;
    }
  };
}

googleRouter.get(
  "/calendar/today",
  requireScope("calendar"),
  withReauth(async (req, res) => {
    // The client sends its own local-day bounds; the server's timezone may differ once deployed.
    const range = dayRangeSchema.safeParse(req.query);
    if (!range.success) return res.status(400).json({ error: "invalid_range" });
    res.json(await fetchEvents(req.google, range.data));
  }),
);

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const EventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().max(5000).nullable().default(null),
    location: z.string().max(500).nullable().default(null),
    allDay: z.boolean(),
    // All-day: YYYY-MM-DD with an exclusive end date. Timed: ISO date-time with offset.
    start: z.string(),
    end: z.string(),
    timeZone: z.string().min(1).max(64),
  })
  .superRefine((e, ctx) => {
    const valid = e.allDay
      ? isoDate.test(e.start) && isoDate.test(e.end)
      : !Number.isNaN(Date.parse(e.start)) && !Number.isNaN(Date.parse(e.end));
    if (!valid) ctx.addIssue({ code: "custom", message: "Invalid start or end" });
    else if (Date.parse(e.end) <= Date.parse(e.start)) {
      ctx.addIssue({ code: "custom", message: "End must be after start" });
    }
  });

/** Google says 403 when the event belongs to someone else and can't be changed. */
function withEditErrors(handler) {
  return withReauth(async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) return res.status(403).json({ error: "event_not_editable" });
      if (status === 404 || status === 410) return res.status(404).json({ error: "event_not_found" });
      throw err;
    }
  });
}

googleRouter.post(
  "/calendar/events",
  requireScope("calendarEdit"),
  withEditErrors(async (req, res) => {
    const input = EventInputSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "invalid_event", issues: input.error.issues });
    res.status(201).json(await createEvent(req.google, input.data));
  }),
);

googleRouter.patch(
  "/calendar/events/:id",
  requireScope("calendarEdit"),
  withEditErrors(async (req, res) => {
    const input = EventInputSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "invalid_event", issues: input.error.issues });
    res.json(await updateEvent(req.google, req.params.id, input.data));
  }),
);

googleRouter.delete(
  "/calendar/events/:id",
  requireScope("calendarEdit"),
  withEditErrors(async (req, res) => {
    await deleteEvent(req.google, req.params.id);
    res.status(204).end();
  }),
);

googleRouter.get(
  "/gmail/recent",
  requireScope("gmail"),
  withReauth(async (req, res) => {
    res.json(await fetchRecentEmails(req.google));
  }),
);
