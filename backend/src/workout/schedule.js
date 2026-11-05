// Which workout is "today": the rotation position from the cycle start date, unless the
// user picked a different day for today (settings.workoutOverride).
// Mirrors frontend/src/lib/workout.ts todaysWorkout().
import { weekdayKey } from "../lib/time.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function rotationWeekIndex(plan, cycleStart, date) {
  const toUtc = (d) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  const weeks = Math.floor(Math.round((toUtc(date) - toUtc(cycleStart)) / MS_PER_DAY) / 7);
  const n = plan.weeks.length;
  return ((weeks % n) + n) % n;
}

/** { weekIndex, week, day, overridden } for a YYYY-MM-DD date in the user's timezone. */
export function workoutForDate(plan, settings, date) {
  const override = settings.workoutOverride;
  if (override && override.date === date) {
    const week = plan.weeks[override.weekIndex];
    const day = week?.days.find((d) => d.weekday === override.weekday);
    if (day) return { weekIndex: override.weekIndex, week, day, overridden: true };
  }
  const weekIndex = rotationWeekIndex(plan, settings.workoutCycleStart, date);
  const week = plan.weeks[weekIndex];
  const day = week.days.find((d) => d.weekday === weekdayKey(date)) ?? null;
  return { weekIndex, week, day, overridden: false };
}
