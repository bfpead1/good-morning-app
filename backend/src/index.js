import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieSession from "cookie-session";
import express from "express";
import { config } from "./config.js";
import { startMorningPlanJob } from "./jobs/morningPlan.js";
import { db } from "./db/index.js";
import { authRouter } from "./routes/auth.js";
import { canvasRouter } from "./routes/canvas.js";
import { googleRouter } from "./routes/google.js";
import { planRouter } from "./routes/plan.js";
import { scriptureRouter } from "./routes/scripture.js";
import { settingsRouter } from "./routes/settings.js";
import { workoutRouter } from "./routes/workout.js";

const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(
  cookieSession({
    name: "gm_session",
    keys: [config.sessionSecret],
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
    httpOnly: true,
    secure: config.isProduction,
  }),
);

app.use("/api/auth", authRouter);
app.use("/api/google", googleRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/scripture", scriptureRouter);
app.use("/api/workout", workoutRouter);
app.use("/api/plan", planRouter);
app.use("/api/canvas", canvasRouter);

// Pinged by Render's health check and the keep-warm cron job.
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// In production Express also serves the built frontend, so the app and API share one origin.
if (config.isProduction) {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");
  app.use(express.static(dist));
  app.get("/{*splat}", (req, res, next) =>
    req.path.startsWith("/api") ? next() : res.sendFile(path.join(dist, "index.html")),
  );
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Data store: ${db.kind} · AI (Groq ${config.groq.model}): ${config.aiEnabled ? "on" : "off (no GROQ_API_KEY)"}`);
  startMorningPlanJob();
});
