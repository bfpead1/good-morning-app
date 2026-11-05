// Generates and saves the daily plan. Used by POST /api/plan/generate and the morning job.
import { generateJson } from "../ai/groq.js";
import { buildDailyPlanPrompt, DAILY_PLAN_SYSTEM } from "../ai/prompts.js";
import { DailyPlanSchema, validateDailyPlan } from "../ai/schemas.js";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { CanvasError, canvasConnection, fetchMissing, fetchUpcoming } from "../lib/canvas.js";
import { clientForUser, connectionsFromScope } from "../lib/google.js";
import { fetchEvents, fetchRecentEmails } from "../lib/googleData.js";
import { localDate, localDayRange, localTime, toMinutes } from "../lib/time.js";
import { getSettings } from "../routes/settings.js";
import { activePlan } from "../workout/activePlan.js";
import { workoutForDate } from "../workout/schedule.js";

const SNIPPET_MAX = 200;
const COURSEWORK_DAYS = 3;

/**
 * Canvas work due in the next few days (not yet done) plus missing work, with due times in
 * the user's timezone. null if Canvas isn't connected; "unavailable" if it errored, so a
 * Canvas outage never blocks the plan.
 */
async function gatherCoursework(userId, dayStart, timeZone) {
  let conn;
  try {
    conn = await canvasConnection(userId);
  } catch (err) {
    if (err instanceof CanvasError && err.code === "canvas_not_connected") return null;
    return "unavailable";
  }
  try {
    const end = new Date(dayStart.getTime() + COURSEWORK_DAYS * 24 * 60 * 60 * 1000);
    const [upcoming, missing] = await Promise.all([fetchUpcoming(conn, { start: dayStart, end }), fetchMissing(conn)]);
    const due = (iso) =>
      iso
        ? new Date(iso).toLocaleString("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "no due date";
    const shape = (i) => ({ title: i.title, course: i.course, due: due(i.dueAt), points: i.points });
    return {
      upcoming: upcoming.filter((i) => !i.done).slice(0, 15).map(shape),
      missing: missing.slice(0, 10).map(shape),
    };
  } catch (err) {
    console.warn(`Canvas unavailable for daily plan: ${err.code ?? ""} ${err.message}`);
    return "unavailable";
  }
}

export function todayInAppZone() {
  return localDate(new Date(), config.timeZone);
}

/** Timed events as local HH:MM, clipped to the day; all-day event titles separately. */
function localizeEvents(events, range, timeZone) {
  const timed = [];
  const allDay = [];
  for (const e of events) {
    if (e.allDay) {
      allDay.push(e.title);
      continue;
    }
    const start = new Date(e.start) <= range.start ? "00:00" : localTime(new Date(e.start), timeZone);
    const end = new Date(e.end) >= range.end ? "23:59" : localTime(new Date(e.end), timeZone);
    if (toMinutes(end) > toMinutes(start)) timed.push({ start, end, title: e.title, location: e.location });
  }
  return { timed, allDay };
}

/** Builds today's plan with Groq, validates it, and saves it. Throws AiError or Google errors. */
export async function generateDailyPlan(user, date = todayInAppZone()) {
  const timeZone = config.timeZone;
  const range = localDayRange(date, timeZone);
  const connections = connectionsFromScope(user.tokens.scope);
  const google = clientForUser(user);

  const [rawEvents, rawEmails, settings, { plan: workoutPlan }, coursework] = await Promise.all([
    connections.calendar ? fetchEvents(google, range) : null,
    connections.gmail ? fetchRecentEmails(google, { max: 15 }) : null,
    getSettings(user.id),
    activePlan(user.id),
    gatherCoursework(user.id, range.start, timeZone),
  ]);

  const { timed, allDay } = rawEvents ? localizeEvents(rawEvents, range, timeZone) : { timed: [], allDay: [] };
  // Sender, subject, and a short snippet only; full email bodies are never fetched or sent.
  const emails = rawEmails?.map(({ id, from, subject, snippet }) => ({
    id,
    from,
    subject,
    snippet: snippet.slice(0, SNIPPET_MAX),
  }));
  const { day } = workoutForDate(workoutPlan, settings, date);
  const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  const plan = await generateJson({
    name: "daily_plan",
    system: DAILY_PLAN_SYSTEM,
    user: buildDailyPlanPrompt({
      date,
      weekday,
      timeZone,
      events: rawEvents ? timed : null,
      allDay,
      emails: emails ?? null,
      workout: day && day.type !== "rest" ? { title: day.title, durationMinutes: day.durationMinutes } : null,
      scriptureMinutes: settings.scripturePace.minutesPerSession,
      coursework,
    }),
    schema: DailyPlanSchema,
    validate: (p) => validateDailyPlan(p, { events: timed, emailIds: (emails ?? []).map((e) => e.id) }),
    maxTokens: 4000,
  });

  // Sort blocks, and attach sender/subject to email actions for display (no bodies stored).
  const byId = new Map((emails ?? []).map((e) => [e.id, e]));
  const saved = {
    ...plan,
    time_blocks: [...plan.time_blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
    email_actions: plan.email_actions.map((a) => ({
      ...a,
      subject: byId.get(a.email_id)?.subject ?? null,
      from: byId.get(a.email_id)?.from ?? null,
    })),
  };
  const row = await db.briefs.save(user.id, date, saved);
  return { date, plan: row.brief, generatedAt: row.createdAt };
}
