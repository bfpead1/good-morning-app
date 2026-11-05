import { Router } from "express";
import { z } from "zod";
import { sendAiError } from "../ai/groq.js";
import { db } from "../db/index.js";
import { isReauthError } from "../lib/google.js";
import { requireUser } from "../lib/requireUser.js";
import { generateDailyPlan, todayInAppZone } from "../plan/dailyPlan.js";

export const planRouter = Router();
planRouter.use(requireUser);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** The saved plan for a day. Never calls Groq. 404 when none has been generated yet. */
planRouter.get("/today", async (req, res) => {
  const date = dateSchema.safeParse(req.query.date ?? todayInAppZone());
  if (!date.success) return res.status(400).json({ error: "invalid_date" });
  const row = await db.briefs.get(req.user.id, date.data);
  // Plans saved before the Groq switch have a different shape; treat them as missing.
  if (!row || !Array.isArray(row.brief?.time_blocks)) return res.status(404).json({ error: "no_plan" });
  res.json({ date: date.data, plan: row.brief, generatedAt: row.createdAt });
});

// One generation per user at a time, even if the button is pressed twice.
const inFlight = new Map();

/** Generates (or regenerates) today's plan with Groq and saves it. */
planRouter.post("/generate", async (req, res) => {
  const key = req.user.id;
  try {
    if (!inFlight.has(key)) {
      inFlight.set(key, generateDailyPlan(req.user).finally(() => inFlight.delete(key)));
    }
    res.json(await inFlight.get(key));
  } catch (err) {
    if (isReauthError(err)) return res.status(401).json({ error: "google_reauth_required" });
    sendAiError(res, err);
  }
});
