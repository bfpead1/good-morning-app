// Generates each user's daily plan once a day at PLAN_JOB_TIME (APP_TIMEZONE), in-process.
// Checks every minute, so if the server was off at the scheduled time (laptop asleep),
// it catches up as soon as it's running again. Skips users who already have today's plan.
import { config } from "../config.js";
import { db } from "../db/index.js";
import { localTime, toMinutes } from "../lib/time.js";
import { generateDailyPlan, todayInAppZone } from "../plan/dailyPlan.js";

const CHECK_EVERY_MS = 60_000;
// date -> Set of user ids already attempted, so a failure doesn't retry every minute.
const attempted = new Map();

async function tick() {
  const date = todayInAppZone();
  if (toMinutes(localTime(new Date(), config.timeZone)) < toMinutes(config.planJobTime)) return;

  if (!attempted.has(date)) {
    attempted.clear();
    attempted.set(date, new Set());
  }
  const done = attempted.get(date);

  for (const userId of await db.users.listIds()) {
    if (done.has(userId)) continue;
    done.add(userId);
    const existing = await db.briefs.get(userId, date);
    if (existing && Array.isArray(existing.brief?.time_blocks)) continue;

    const user = await db.users.get(userId);
    if (!user) continue;
    try {
      await generateDailyPlan(user, date);
      console.log(`Morning job: generated ${date} plan for ${user.email}`);
    } catch (err) {
      // The user can still press Generate in the app.
      console.error(`Morning job: couldn't generate ${date} plan for ${user.email}: ${err.code ?? ""} ${err.message}`);
    }
  }
}

export function startMorningPlanJob() {
  if (!config.aiEnabled) {
    console.log("Morning plan job: off (no GROQ_API_KEY)");
    return;
  }
  console.log(`Morning plan job: daily at ${config.planJobTime} ${config.timeZone}`);
  const run = () => tick().catch((err) => console.error("Morning job error:", err));
  run();
  setInterval(run, CHECK_EVERY_MS).unref();
}
