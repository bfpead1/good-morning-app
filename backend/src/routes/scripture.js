import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { requireUser } from "../lib/requireUser.js";

export const scriptureRouter = Router();
scriptureRouter.use(requireUser);

// Book of Mormon slugs as used by Gospel Library URLs, with chapter counts.
const CHAPTERS = {
  "1-ne": 22, "2-ne": 33, jacob: 7, enos: 1, jarom: 1, omni: 1, "w-of-m": 1,
  mosiah: 29, alma: 63, hel: 16, "3-ne": 30, "4-ne": 1, morm: 9, ether: 15, moro: 10,
};

const chapterRef = z
  .object({ slug: z.string(), chapter: z.number().int().positive() })
  .refine(({ slug, chapter }) => CHAPTERS[slug] !== undefined && chapter <= CHAPTERS[slug], {
    message: "Unknown book or chapter",
  });

const UpdateSchema = z.object({
  chapters: z.array(chapterRef).min(1).max(300),
  completed: z.boolean(),
  // "quiz" when a Learning Mode quiz was passed.
  via: z.enum(["manual", "quiz"]).default("manual"),
});

// The old study app's localStorage "bom_progress" value:
// { [slug]: { [chapter]: true | false | { completed, completedAt, ... } } }
const ImportSchema = z.record(
  z.string(),
  z.record(z.string(), z.union([z.boolean(), z.object({ completed: z.boolean(), completedAt: z.string().nullish() }).loose()])),
);

scriptureRouter.get("/progress", async (req, res) => {
  res.json(await db.scripture.getProgress(req.user.id));
});

scriptureRouter.put("/progress", async (req, res) => {
  const body = UpdateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_progress", issues: body.error.issues });

  const completedAt = new Date().toISOString();
  await db.scripture.setChapters(
    req.user.id,
    body.data.chapters.map(({ slug, chapter }) => ({
      slug,
      chapter,
      completed: body.data.completed,
      completedVia: body.data.via,
      completedAt,
    })),
  );
  res.json(await db.scripture.getProgress(req.user.id));
});

/** Imports progress exported from the standalone study app. Only adds completions. */
scriptureRouter.post("/progress/import", async (req, res) => {
  const body = ImportSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_import" });

  const records = [];
  for (const [slug, chapters] of Object.entries(body.data)) {
    for (const [chapterKey, value] of Object.entries(chapters)) {
      const chapter = Number(chapterKey);
      const ref = chapterRef.safeParse({ slug, chapter });
      const completed = typeof value === "boolean" ? value : value.completed;
      if (!ref.success || !completed) continue;
      records.push({
        slug,
        chapter,
        completed: true,
        completedVia: "import",
        completedAt: (typeof value === "object" && value.completedAt) || new Date().toISOString(),
      });
    }
  }

  if (records.length) await db.scripture.setChapters(req.user.id, records);
  res.json({ imported: records.length, progress: await db.scripture.getProgress(req.user.id) });
});
