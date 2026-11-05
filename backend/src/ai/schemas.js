// Response schemas for every AI feature. Zod checks the structure; the validate*()
// functions check rules a schema can't express. A failed check triggers one retry
// (see generateJson in groq.js), then an error.
import { z } from "zod";
import { toMinutes } from "../lib/time.js";
import { PlanDaySchema, PlanWeekSchema, validatePlanShape } from "../workout/planSchema.js";

// ─── Daily plan ────────────────────────────────────────────────────────────

export const BLOCK_TYPES = ["class", "task", "workout", "study", "break"];

export const DailyPlanSchema = z.object({
  priorities: z.array(
    z.object({
      title: z.string().min(1),
      reason: z.string().min(1),
      estimated_minutes: z.number(),
    }),
  ),
  time_blocks: z.array(
    z.object({
      start: z.string(), // "HH:MM", 24-hour, user's timezone
      end: z.string(),
      label: z.string().min(1),
      type: z.enum(BLOCK_TYPES),
    }),
  ),
  email_actions: z.array(
    z.object({
      email_id: z.string(),
      suggestion: z.string().min(1),
    }),
  ),
  note: z.string(),
});

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * @param plan    parsed DailyPlanSchema output
 * @param events  today's timed calendar events as { start: "HH:MM", end: "HH:MM", title }
 * @param emailIds ids of the emails the model was given
 */
export function validateDailyPlan(plan, { events, emailIds }) {
  if (plan.priorities.length < 3 || plan.priorities.length > 5) {
    return `Give 3 to 5 priorities (got ${plan.priorities.length}).`;
  }
  for (const p of plan.priorities) {
    if (!(p.estimated_minutes >= 5 && p.estimated_minutes <= 480)) {
      return `estimated_minutes for "${p.title}" must be between 5 and 480.`;
    }
  }

  for (const b of plan.time_blocks) {
    if (!HHMM.test(b.start) || !HHMM.test(b.end)) return `Block "${b.label}" must use 24-hour HH:MM times.`;
    if (toMinutes(b.end) <= toMinutes(b.start)) return `Block "${b.label}" ends before it starts.`;
  }

  // Every timed calendar event must appear with its real times.
  const isEventBlock = (b) => events.some((e) => e.start === b.start && e.end === b.end);
  for (const e of events) {
    if (!plan.time_blocks.some((b) => b.start === e.start && b.end === e.end)) {
      return `Calendar event "${e.title}" (${e.start}–${e.end}) is missing; include every calendar event at its exact time.`;
    }
  }

  // No overlaps, except between two calendar events that are themselves double-booked.
  const sorted = [...plan.time_blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (toMinutes(b.start) >= toMinutes(a.end)) break;
      if (isEventBlock(a) && isEventBlock(b)) continue;
      return `"${a.label}" (${a.start}–${a.end}) overlaps "${b.label}" (${b.start}–${b.end}). Blocks must not overlap or cover calendar events.`;
    }
  }

  if (plan.email_actions.length > 5) return "Give at most 5 email actions.";
  for (const a of plan.email_actions) {
    if (!emailIds.includes(a.email_id)) return `email_id "${a.email_id}" is not one of the provided emails.`;
  }
  return null;
}

// ─── Workout generator ─────────────────────────────────────────────────────

export const EditDayResultSchema = z.object({
  summary: z.string().min(1),
  changes: z.array(z.object({ change: z.string(), why: z.string() })),
  day: PlanDaySchema,
});

export const NewPlanResultSchema = z.object({
  summary: z.string().min(1),
  plan: z.object({
    name: z.string().min(1),
    weeks: z.array(PlanWeekSchema),
  }),
});

export function validateNewPlan(result, { daysPerWeek }) {
  if (result.plan.weeks.length !== 1) return "Return exactly one week.";
  const shape = validatePlanShape(result.plan);
  if (shape) return shape;
  const trainingDays = result.plan.weeks[0].days.filter((d) => d.type !== "rest").length;
  if (trainingDays !== daysPerWeek) {
    return `The week has ${trainingDays} training days but the client asked for ${daysPerWeek}; the other days must be type "rest".`;
  }
  return validateDays(result.plan.weeks[0].days);
}

export function validateEditedDay(result) {
  return validateDays([result.day]);
}

function validateDays(days) {
  for (const d of days) {
    if (d.type === "rest") continue;
    if (!d.sections.length || d.sections.every((s) => !s.items.length)) return `${d.weekday} has no exercises.`;
    if (!(d.durationMinutes >= 10 && d.durationMinutes <= 240)) return `${d.weekday} durationMinutes must be 10–240.`;
  }
  return null;
}
