import { z } from "zod";

// One shape for every row in a plan, so the AI can edit any section type:
//   exercises    name="Barbell Bench Press"  detail="Main strength lift"  amount="4 × 8–10"
//   hiit         name="Plank Hold"                                        amount="40 sec"
//   activities   name="Warm-Up — 4 laps easy freestyle"  detail="Breathe every 3 strokes."
//   percentages  name="Set 1"  amount="3" (reps)  detail="~75%" (load)
// `swap` marks an exercise that rotated in versus the previous week.
export const PlanItemSchema = z.object({
  name: z.string(),
  detail: z.string().nullable(),
  amount: z.string().nullable(),
  swap: z.boolean(),
});

export const PlanSectionSchema = z.object({
  title: z.string(),
  kind: z.enum(["exercises", "hiit", "activities", "percentages"]),
  items: z.array(PlanItemSchema),
});

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const PlanDaySchema = z.object({
  weekday: z.enum(WEEKDAYS),
  title: z.string(),
  type: z.enum(["push", "legs", "swim", "hike", "rest", "strength"]),
  durationMinutes: z.number(),
  sections: z.array(PlanSectionSchema),
  note: z.string().nullable(),
});

export const PlanWeekSchema = z.object({
  label: z.string(),
  banner: z.string().nullable(),
  days: z.array(PlanDaySchema),
});

export const WorkoutPlanSchema = z.object({
  name: z.string(),
  weeks: z.array(PlanWeekSchema),
});

/** Structural checks the JSON schema can't express: 1–6 weeks, each with all seven weekdays once. */
export function validatePlanShape(plan) {
  if (plan.weeks.length < 1 || plan.weeks.length > 6) return "Plan must have 1–6 weeks";
  for (const week of plan.weeks) {
    const days = week.days.map((d) => d.weekday);
    if (days.length !== 7 || WEEKDAYS.some((d) => !days.includes(d))) {
      return `${week.label} must have exactly one entry for each weekday`;
    }
  }
  return null;
}
