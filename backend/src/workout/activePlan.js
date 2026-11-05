import { db } from "../db/index.js";
import { DEFAULT_PLAN } from "./defaultPlan.js";

/** The user's current plan: their saved custom plan, or the default 2-week rotation. */
export async function activePlan(userId) {
  const custom = await db.workoutPlans.getActive(userId);
  return custom
    ? { plan: custom.plan, source: custom.source, summary: custom.summary, updatedAt: custom.createdAt }
    : { plan: DEFAULT_PLAN, source: "default", summary: null, updatedAt: null };
}
