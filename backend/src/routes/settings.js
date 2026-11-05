import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { requireUser } from "../lib/requireUser.js";
import { localDate, weekdayKey } from "../lib/time.js";

export const settingsRouter = Router();
settingsRouter.use(requireUser);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const SettingsPatchSchema = z
  .object({
    // Monday that Week 1 of the workout rotation started on.
    workoutCycleStart: isoDate,
    scripturePace: z.object({
      daysPerWeek: z.number().int().min(1).max(7),
      minutesPerSession: z.number().int().min(5).max(120),
    }),
    // Learning Mode: a chapter only counts as read after passing its quiz.
    scriptureLearningMode: z.boolean(),
    // A different workout chosen for one day: { date, weekIndex, weekday }. null clears it.
    workoutOverride: z
      .object({
        date: isoDate,
        weekIndex: z.number().int().min(0).max(5),
        weekday: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
      })
      .nullable(),
    // What the AI workout generator designs around.
    workoutProfile: z.object({
      goals: z.string().max(500),
      equipment: z.string().max(500),
      daysPerWeek: z.number().int().min(1).max(7),
    }),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        label: z.string().max(120),
      })
      .nullable(),
  })
  .partial()
  .strict();

const DEFAULT_SCRIPTURE_PACE = { daysPerWeek: 7, minutesPerSession: 15 };

// Pre-filled from the original training plan.
const DEFAULT_WORKOUT_PROFILE = {
  goals: "Build strength and muscle, improve cardio and VO₂ max",
  equipment: "Free barbell, dumbbells, gym machines (lat pulldown, cable row, leg press), pool, hiking trails",
  daysPerWeek: 6,
};

/** Monday of the current week in APP_TIMEZONE, as YYYY-MM-DD. */
export function mondayOfThisWeek() {
  const today = localDate(new Date(), config.timeZone);
  const back = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(weekdayKey(today));
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10);
}

/** Settings with defaults filled in. Pins the workout cycle start the first time it's read. */
export async function getSettings(userId) {
  let settings = await db.settings.get(userId);
  if (!settings.workoutCycleStart) {
    settings = await db.settings.update(userId, { workoutCycleStart: mondayOfThisWeek() });
  }
  return {
    scripturePace: DEFAULT_SCRIPTURE_PACE,
    scriptureLearningMode: false,
    workoutOverride: null,
    workoutProfile: DEFAULT_WORKOUT_PROFILE,
    location: null,
    ...settings,
  };
}

settingsRouter.get("/", async (req, res) => {
  res.json({
    ...(await getSettings(req.user.id)),
    features: { ai: config.aiEnabled, database: db.kind },
  });
});

settingsRouter.patch("/", async (req, res) => {
  const patch = SettingsPatchSchema.safeParse(req.body);
  if (!patch.success) return res.status(400).json({ error: "invalid_settings", issues: patch.error.issues });
  await db.settings.update(req.user.id, patch.data);
  res.json({
    ...(await getSettings(req.user.id)),
    features: { ai: config.aiEnabled, database: db.kind },
  });
});
