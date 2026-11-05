import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { generateJson, sendAiError } from "../ai/groq.js";
import {
  buildEditDayPrompt,
  buildNewPlanPrompt,
  EDIT_DAY_SYSTEM,
  NEW_PLAN_SYSTEM,
} from "../ai/prompts.js";
import {
  EditDayResultSchema,
  NewPlanResultSchema,
  validateEditedDay,
  validateNewPlan,
} from "../ai/schemas.js";
import { config } from "../config.js";
import { requireUser } from "../lib/requireUser.js";
import { localDate } from "../lib/time.js";
import { activePlan } from "../workout/activePlan.js";
import { getSettings, mondayOfThisWeek } from "./settings.js";

export const workoutRouter = Router();
workoutRouter.use(requireUser);

// ─── Plan ──────────────────────────────────────────────────────────────────

workoutRouter.get("/plan", async (req, res) => {
  res.json(await activePlan(req.user.id));
});

/** Back to the original 2-week plan. Custom versions stay in history (Supabase). */
workoutRouter.post("/plan/reset", async (req, res) => {
  await db.workoutPlans.clearActive(req.user.id);
  res.json(await activePlan(req.user.id));
});

// ─── Body metrics ──────────────────────────────────────────────────────────

const optionalNumber = (min, max) => z.number().min(min).max(max).nullable();

const MetricSchema = z
  .object({
    measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weightLbs: optionalNumber(50, 700),
    muscleMassLbs: optionalNumber(20, 400),
    bodyFatPct: optionalNumber(2, 70),
    note: z.string().max(500).nullable(),
  })
  .refine((m) => m.weightLbs !== null || m.muscleMassLbs !== null || m.bodyFatPct !== null, {
    message: "Enter at least one measurement",
  });

workoutRouter.get("/metrics", async (req, res) => {
  res.json(await db.bodyMetrics.list(req.user.id));
});

workoutRouter.post("/metrics", async (req, res) => {
  const body = MetricSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_metric", issues: body.error.issues });
  res.status(201).json(await db.bodyMetrics.add(req.user.id, body.data));
});

workoutRouter.delete("/metrics/:id", async (req, res) => {
  await db.bodyMetrics.remove(req.user.id, req.params.id);
  res.status(204).end();
});

// ─── Daily check-offs ──────────────────────────────────────────────────────

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const LogSchema = z.object({
  weekLabel: z.string().max(100),
  dayTitle: z.string().max(200),
  // Item keys: "<section title>::<item name>"
  completed: z.array(z.string().max(500)).max(200),
  totalItems: z.number().int().min(0).max(200),
});

/** YYYY-MM-DD `days` before `today` (client-supplied, so it's the user's local date). */
function daysBefore(today, days) {
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}

workoutRouter.get("/logs", async (req, res) => {
  const query = z.object({ since: z.string().regex(isoDate).optional() }).safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: "invalid_query" });
  res.json(await db.workoutLogs.list(req.user.id, query.data));
});

workoutRouter.put("/logs/:date", async (req, res) => {
  if (!isoDate.test(req.params.date)) return res.status(400).json({ error: "invalid_date" });
  const body = LogSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_log", issues: body.error.issues });
  res.json(await db.workoutLogs.upsert(req.user.id, req.params.date, body.data));
});

/** Recent check-offs for the AI: per day, how much was done and which items were skipped. */
function summarizeLogs(logs, plan) {
  return logs.map((log) => {
    const day = plan.weeks
      .find((w) => w.label === log.weekLabel)
      ?.days.find((d) => d.title === log.dayTitle);
    const done = new Set(log.completed);
    const skipped = day
      ? day.sections.flatMap((s) => s.items.filter((i) => !done.has(`${s.title}::${i.name}`)).map((i) => i.name))
      : [];
    return {
      date: log.date,
      workout: `${log.weekLabel} · ${log.dayTitle}`,
      completed: `${log.completed.length} of ${log.totalItems}`,
      skipped,
    };
  });
}

// ─── AI workout generator ──────────────────────────────────────────────────
//
// Two modes, both reviewed before anything changes (accept/dismiss below):
//   edit_day  — rewrite one day of the current plan
//   new_plan  — design a brand-new one-week plan, ignoring the current one
// Both stay small enough for Groq's free-tier token limits.

const GenerateSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("edit_day"),
    weekIndex: z.number().int().min(0).max(5),
    weekday: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    notes: z.string().max(1000).default(""),
    today: z.string().regex(isoDate).optional(),
  }),
  z.object({
    mode: z.literal("new_plan"),
    notes: z.string().max(1000).default(""),
    today: z.string().regex(isoDate).optional(),
  }),
]);

workoutRouter.get("/suggestions/latest", async (req, res) => {
  res.json(await db.suggestions.latestPending(req.user.id));
});

workoutRouter.post("/generate", async (req, res) => {
  const body = GenerateSchema.safeParse(req.body ?? {});
  if (!body.success) return res.status(400).json({ error: "invalid_request", issues: body.error.issues });
  const input = body.data;
  const notes = input.notes.trim();

  const today = input.today ?? localDate(new Date(), config.timeZone);
  const [{ plan }, settings, metrics, logs] = await Promise.all([
    activePlan(req.user.id),
    getSettings(req.user.id),
    db.bodyMetrics.list(req.user.id),
    db.workoutLogs.list(req.user.id, { since: daysBefore(today, 42) }),
  ]);
  const profile = settings.workoutProfile;
  const recentMetrics = metrics.slice(0, 10).map(({ id, createdAt, ...m }) => m);

  try {
    if (input.mode === "edit_day") {
      const week = plan.weeks[input.weekIndex];
      const day = week?.days.find((d) => d.weekday === input.weekday);
      if (!day) return res.status(404).json({ error: "day_not_found" });

      // History for this workout only keeps the prompt small.
      const history = summarizeLogs(logs.filter((l) => l.dayTitle === day.title), plan).slice(0, 8);
      const result = await generateJson({
        name: "edited_day",
        system: EDIT_DAY_SYSTEM,
        user: buildEditDayPrompt({ day, weekLabel: week.label, profile, history, metrics: recentMetrics, notes }),
        schema: EditDayResultSchema,
        validate: validateEditedDay,
        maxTokens: 3000,
      });

      const newDay = { ...result.day, weekday: input.weekday };
      const newPlan = structuredClone(plan);
      newPlan.weeks[input.weekIndex].days = newPlan.weeks[input.weekIndex].days.map((d) =>
        d.weekday === input.weekday ? newDay : d,
      );
      const suggestion = await db.suggestions.create(req.user.id, {
        kind: "edit_day",
        target: { weekIndex: input.weekIndex, weekday: input.weekday },
        request: notes || null,
        summary: result.summary,
        changes: result.changes,
        plan: newPlan,
      });
      return res.status(201).json(suggestion);
    }

    const result = await generateJson({
      name: "new_plan",
      system: NEW_PLAN_SYSTEM,
      user: buildNewPlanPrompt({
        profile,
        history: summarizeLogs(logs, plan).slice(0, 14),
        metrics: recentMetrics,
        notes,
      }),
      schema: NewPlanResultSchema,
      validate: (r) => validateNewPlan(r, { daysPerWeek: profile.daysPerWeek }),
      maxTokens: 6000,
    });
    const suggestion = await db.suggestions.create(req.user.id, {
      kind: "new_plan",
      target: null,
      request: notes || null,
      summary: result.summary,
      changes: [],
      plan: result.plan,
    });
    res.status(201).json(suggestion);
  } catch (err) {
    sendAiError(res, err);
  }
});

workoutRouter.post("/suggestions/:id/accept", async (req, res) => {
  const suggestion = await db.suggestions.get(req.user.id, req.params.id);
  if (!suggestion || suggestion.status !== "pending") return res.status(404).json({ error: "not_found" });

  await db.workoutPlans.setActive(req.user.id, {
    plan: suggestion.plan,
    source: "ai",
    summary: suggestion.summary,
  });
  if (suggestion.kind === "new_plan") {
    // A new plan starts at Week 1, and a day picked from the old plan no longer applies.
    await db.settings.update(req.user.id, { workoutCycleStart: mondayOfThisWeek(), workoutOverride: null });
  }
  await db.suggestions.setStatus(req.user.id, suggestion.id, "accepted");
  res.json(await activePlan(req.user.id));
});

workoutRouter.post("/suggestions/:id/dismiss", async (req, res) => {
  await db.suggestions.setStatus(req.user.id, req.params.id, "dismissed");
  res.status(204).end();
});
