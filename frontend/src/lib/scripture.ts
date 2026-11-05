import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ALL_CHAPTERS, TOTAL_CHAPTERS, type Chapter } from "../data/bookOfMormon";
import { getJson, sendJson } from "./api";

export type ChapterRecord = { completed: true; completedVia: string; completedAt: string | null };
/** { [bookSlug]: { [chapter]: record } } */
export type ScriptureProgress = Record<string, Record<string, ChapterRecord>>;
export type Pace = { daysPerWeek: number; minutesPerSession: number };

// ~25 verses ≈ 15 minutes of reflective study (from the study app).
export const VERSES_PER_MINUTE = 25 / 15;

export function isRead(progress: ScriptureProgress | undefined, slug: string, chapter: number) {
  return Boolean(progress?.[slug]?.[chapter]?.completed);
}

/**
 * Assigns a session (day) number to every chapter for a target verses-per-session.
 * Whole chapters only. Same algorithm as the study app's assignDays().
 */
export function assignSessions(minutesPerSession: number): number[] {
  const target = Math.max(10, Math.round(minutesPerSession * VERSES_PER_MINUTE));
  const sessions: number[] = [];
  let session = 1;
  let acc = 0;
  for (const ch of ALL_CHAPTERS) {
    // Close the session early if it's reasonably full and the next chapter would overshoot badly.
    if (acc >= target * 0.6 && acc + ch.verses > target * 1.5) {
      session++;
      acc = 0;
    }
    sessions.push(session);
    acc += ch.verses;
    if (acc >= target) {
      session++;
      acc = 0;
    }
  }
  return sessions;
}

export type Session = {
  number: number;
  chapters: (Chapter & { read: boolean })[];
  verses: number;
  minutes: number;
};

/** The first session that still has unread chapters, or null when the book is finished. */
export function nextSession(progress: ScriptureProgress | undefined, pace: Pace): Session | null {
  const sessions = assignSessions(pace.minutesPerSession);
  const firstUnread = ALL_CHAPTERS.findIndex((ch) => !isRead(progress, ch.book.slug, ch.chapter));
  if (firstUnread === -1) return null;

  const number = sessions[firstUnread];
  const chapters = ALL_CHAPTERS.map((ch, i) => ({ ...ch, i }))
    .filter(({ i }) => sessions[i] === number)
    .map(({ i: _i, ...ch }) => ({ ...ch, read: isRead(progress, ch.book.slug, ch.chapter) }));
  const verses = chapters.reduce((n, ch) => n + ch.verses, 0);
  return { number, chapters, verses, minutes: Math.max(5, Math.round(verses / VERSES_PER_MINUTE)) };
}

export function readingStats(progress: ScriptureProgress | undefined, pace: Pace) {
  const sessions = assignSessions(pace.minutesPerSession);
  const read = ALL_CHAPTERS.filter((ch) => isRead(progress, ch.book.slug, ch.chapter)).length;

  // A session is done when every chapter in it is read.
  const remaining = new Set<number>();
  ALL_CHAPTERS.forEach((ch, i) => {
    if (!isRead(progress, ch.book.slug, ch.chapter)) remaining.add(sessions[i]);
  });

  const finish = new Date();
  finish.setDate(finish.getDate() + Math.ceil((remaining.size / pace.daysPerWeek) * 7));

  return {
    read,
    total: TOTAL_CHAPTERS,
    percent: Math.round((read / TOTAL_CHAPTERS) * 100),
    sessionsLeft: remaining.size,
    totalSessions: sessions.at(-1) ?? 0,
    estimatedFinish: remaining.size ? finish : null,
  };
}

/** "Alma 32–33" or "1 Nephi 22 – 2 Nephi 1" for the chapters in one reading session. */
export function sessionLabel(chapters: { book: { name: string }; chapter: number }[]) {
  const first = chapters[0];
  const last = chapters.at(-1)!;
  if (first.book.name === last.book.name) {
    return first.chapter === last.chapter
      ? `${first.book.name} ${first.chapter}`
      : `${first.book.name} ${first.chapter}–${last.chapter}`;
  }
  return `${first.book.name} ${first.chapter} – ${last.book.name} ${last.chapter}`;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

const PROGRESS_KEY = ["scripture", "progress"];

export function useScriptureProgress() {
  return useQuery({
    queryKey: PROGRESS_KEY,
    queryFn: () => getJson<ScriptureProgress>("/api/scripture/progress"),
  });
}

export function useMarkChapters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      chapters: { slug: string; chapter: number }[];
      completed: boolean;
      via?: "manual" | "quiz";
    }) =>
      sendJson<ScriptureProgress>("/api/scripture/progress", "PUT", body),
    // Optimistic update so tapping a chapter feels instant.
    onMutate: async ({ chapters, completed, via = "manual" }) => {
      await queryClient.cancelQueries({ queryKey: PROGRESS_KEY });
      const previous = queryClient.getQueryData<ScriptureProgress>(PROGRESS_KEY);
      const next: ScriptureProgress = structuredClone(previous ?? {});
      for (const { slug, chapter } of chapters) {
        next[slug] ??= {};
        if (completed) {
          next[slug][chapter] = { completed: true, completedVia: via, completedAt: new Date().toISOString() };
        } else {
          delete next[slug][chapter];
        }
      }
      queryClient.setQueryData(PROGRESS_KEY, next);
      return { previous };
    },
    onError: (_err, _vars, context) => queryClient.setQueryData(PROGRESS_KEY, context?.previous),
    onSuccess: (progress) => queryClient.setQueryData(PROGRESS_KEY, progress),
  });
}

export function useImportProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (raw: unknown) =>
      sendJson<{ imported: number; progress: ScriptureProgress }>("/api/scripture/progress/import", "POST", raw),
    onSuccess: ({ progress }) => queryClient.setQueryData(PROGRESS_KEY, progress),
  });
}
