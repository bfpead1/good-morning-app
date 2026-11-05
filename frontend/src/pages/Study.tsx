import { useEffect, useMemo, useState } from "react";
import { Card, ListRow } from "../components/Card";
import { QuizModal } from "../components/QuizModal";
import { PrimaryButton } from "../components/PrimaryButton";
import { SectionLabel } from "../components/SectionLabel";
import { BOOKS, type Book, gospelLibraryUrl } from "../data/bookOfMormon";
import {
  assignSessions,
  isRead,
  nextSession,
  readingStats,
  sessionLabel,
  useImportProgress,
  useMarkChapters,
  useScriptureProgress,
  type Pace,
} from "../lib/scripture";
import { useSettings, useUpdateSettings } from "../lib/settings";

export function Study() {
  const settings = useSettings();
  const progress = useScriptureProgress();
  const mark = useMarkChapters();
  const [quiz, setQuiz] = useState<QuizTarget | null>(null);

  if (!settings.data || !progress.data) {
    return <p className="px-6 pt-7 text-[14px] text-ink-soft-62">Loading…</p>;
  }

  const learningMode = settings.data.scriptureLearningMode;
  const pace = settings.data.scripturePace;
  const session = nextSession(progress.data, pace);
  const stats = readingStats(progress.data, pace);

  return (
    <div className="px-6 pb-8 pt-7">
      <h1 className="font-display text-[22px] font-medium text-ink">Scripture Study</h1>
      <p className="mb-5 text-[13px] text-ink-soft-55">Book of Mormon reading path</p>

      <section className="mb-5">
        <SectionLabel>Today's Reading</SectionLabel>
        <Card padded={false}>
          {session ? (
            <>
              <div className="px-[18px] pb-1 pt-4">
                <p className="font-display text-[19px] font-medium text-ink">
                  {sessionLabel(session.chapters)}
                </p>
                <p className="text-[13px] text-ink-soft-62">
                  Day {session.number} · {session.verses} verses · about {session.minutes} min
                </p>
              </div>
              {session.chapters.map((ch) => (
                <ListRow key={`${ch.book.slug}-${ch.chapter}`} className="justify-between">
                  {learningMode ? (
                    <span className="flex items-center gap-3 text-[15px] text-ink">
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                          ch.read ? "bg-ink text-cta-on-ink" : "border border-ink/30"
                        }`}
                      >
                        {ch.read && "✓"}
                      </span>
                      {ch.book.name} {ch.chapter}
                      <span className="text-[13px] text-ink-soft-55">{ch.verses} verses</span>
                    </span>
                  ) : (
                    <label className="flex items-center gap-3 text-[15px] text-ink">
                      <input
                        type="checkbox"
                        checked={ch.read}
                        onChange={(e) =>
                          mark.mutate({
                            chapters: [{ slug: ch.book.slug, chapter: ch.chapter }],
                            completed: e.target.checked,
                          })
                        }
                        className="h-5 w-5 accent-[#1e2a38]"
                      />
                      {ch.book.name} {ch.chapter}
                      <span className="text-[13px] text-ink-soft-55">{ch.verses} verses</span>
                    </label>
                  )}
                  <span className="flex shrink-0 items-center gap-3">
                    <a
                      href={gospelLibraryUrl(ch.book.slug, ch.chapter)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-semibold text-ink"
                    >
                      Read ↗
                    </a>
                    {learningMode && (
                      <button
                        type="button"
                        onClick={() => setQuiz({ book: ch.book, chapter: ch.chapter })}
                        className={`rounded-pill px-3 py-1 text-[13px] font-semibold ${
                          ch.read ? "border border-ink/25 text-ink" : "bg-ink text-cta-on-ink"
                        }`}
                      >
                        {ch.read ? "Retake" : "Quiz"}
                      </button>
                    )}
                  </span>
                </ListRow>
              ))}
              <div className="border-t border-divider p-[18px]">
                {learningMode ? (
                  <p className="text-[13.5px] leading-relaxed text-ink-soft-62">
                    Learning Mode is on: pass each chapter's 5-question quiz (4 correct) to mark
                    it read.
                  </p>
                ) : (
                  <PrimaryButton
                    onClick={() =>
                      mark.mutate({
                        chapters: session.chapters
                          .filter((ch) => !ch.read)
                          .map((ch) => ({ slug: ch.book.slug, chapter: ch.chapter })),
                        completed: true,
                      })
                    }
                    disabled={mark.isPending}
                  >
                    Mark today's reading complete
                  </PrimaryButton>
                )}
              </div>
            </>
          ) : (
            <p className="p-[18px] text-[15px] text-ink">
              You've finished the Book of Mormon. Congratulations!
            </p>
          )}
        </Card>
      </section>

      <section className="mb-5">
        <SectionLabel>Progress</SectionLabel>
        <Card>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[15px] font-semibold text-ink">
              {stats.read} / {stats.total} chapters
            </p>
            <p className="text-[13px] text-ink-soft-55">{stats.percent}%</p>
          </div>
          <div
            className="h-2 overflow-hidden rounded-pill bg-divider"
            role="progressbar"
            aria-valuenow={stats.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-pill bg-ink" style={{ width: `${stats.percent}%` }} />
          </div>
          {stats.estimatedFinish && (
            <p className="mt-3 text-[13px] text-ink-soft-62">
              {stats.sessionsLeft} sessions left · estimated finish{" "}
              {stats.estimatedFinish.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </Card>
      </section>

      <PaceSection pace={pace} learningMode={learningMode} />

      <section className="mb-5">
        <SectionLabel>Reading Path</SectionLabel>
        <ReadingPath onQuiz={learningMode ? setQuiz : null} />
      </section>

      <ImportSection />

      {quiz && <QuizModal book={quiz.book} chapter={quiz.chapter} onClose={() => setQuiz(null)} />}
    </div>
  );
}

type QuizTarget = { book: Book; chapter: number };

function PaceSection({ pace, learningMode }: { pace: Pace; learningMode: boolean }) {
  const update = useUpdateSettings();
  const [draft, setDraft] = useState(pace);

  // Save shortly after the sliders stop moving.
  useEffect(() => {
    if (draft.daysPerWeek === pace.daysPerWeek && draft.minutesPerSession === pace.minutesPerSession) return;
    const t = setTimeout(() => update.mutate({ scripturePace: draft }), 500);
    return () => clearTimeout(t);
  }, [draft, pace, update]);

  const verses = Math.round(draft.minutesPerSession * (25 / 15));

  return (
    <section className="mb-5">
      <SectionLabel>Reading Pace</SectionLabel>
      <Card>
        <label className="mb-4 block">
          <span className="mb-1.5 flex justify-between text-[14px] text-ink">
            Days per week <strong>{draft.daysPerWeek}</strong>
          </span>
          <input
            type="range"
            min={1}
            max={7}
            value={draft.daysPerWeek}
            onChange={(e) => setDraft({ ...draft, daysPerWeek: Number(e.target.value) })}
            className="w-full accent-[#1e2a38]"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-[14px] text-ink">
            Minutes per session
            <span>
              <strong>{draft.minutesPerSession}</strong>{" "}
              <span className="text-ink-soft-55">(~{verses} verses)</span>
            </span>
          </span>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={draft.minutesPerSession}
            onChange={(e) => setDraft({ ...draft, minutesPerSession: Number(e.target.value) })}
            className="w-full accent-[#1e2a38]"
          />
        </label>
        <label className="mt-4 flex items-center justify-between gap-4 border-t border-divider pt-4">
          <span>
            <span className="block text-[14px] font-semibold text-ink">Learning Mode</span>
            <span className="block text-[12.5px] text-ink-soft-55">
              Pass a 5-question quiz to mark a chapter read
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={learningMode}
            onChange={(e) => update.mutate({ scriptureLearningMode: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-[#1e2a38]"
          />
        </label>
      </Card>
    </section>
  );
}

function ReadingPath({ onQuiz }: { onQuiz: ((target: QuizTarget) => void) | null }) {
  const settings = useSettings();
  const progress = useScriptureProgress();
  const mark = useMarkChapters();
  const pace = settings.data!.scripturePace;
  const sessions = useMemo(() => assignSessions(pace.minutesPerSession), [pace.minutesPerSession]);
  const current = nextSession(progress.data, pace)?.number;

  let globalIndex = 0;
  return (
    <Card>
      <div className="space-y-5">
        {BOOKS.map((book) => {
          const read = book.verses.filter((_, i) => isRead(progress.data, book.slug, i + 1)).length;
          return (
            <div key={book.slug}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <a
                  href={gospelLibraryUrl(book.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display text-[16px] font-medium text-ink"
                >
                  {book.name}
                </a>
                <span className="text-[12.5px] text-ink-soft-55">
                  {read} / {book.verses.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {book.verses.map((verses, i) => {
                  const chapter = i + 1;
                  const done = isRead(progress.data, book.slug, chapter);
                  const session = sessions[globalIndex++];
                  const isCurrent = session === current;
                  return (
                    <button
                      key={chapter}
                      type="button"
                      title={`${book.short} ${chapter} · ${verses} verses · Day ${session}`}
                      aria-label={`${book.name} ${chapter}${done ? ", read" : ""}`}
                      aria-pressed={done}
                      onClick={() =>
                        onQuiz
                          ? onQuiz({ book, chapter })
                          : mark.mutate({ chapters: [{ slug: book.slug, chapter }], completed: !done })
                      }
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
                        done
                          ? "bg-ink text-cta-on-ink"
                          : isCurrent
                            ? "border-2 border-ink bg-accent text-ink"
                            : "border border-card-border bg-page/40 text-ink"
                      }`}
                    >
                      {chapter}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12.5px] text-ink-soft-55">
        {onQuiz
          ? "Tap a chapter to take its quiz. Highlighted chapters are today's session."
          : "Tap a chapter to mark it read. Highlighted chapters are today's session."}
      </p>
    </Card>
  );
}

function ImportSection() {
  const importProgress = useImportProgress();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError("That doesn't look like valid JSON.");
      return;
    }
    importProgress.mutate(parsed, {
      onError: () => setError("Couldn't import that progress data."),
      onSuccess: () => setRaw(""),
    });
  }

  return (
    <details className="mb-2 rounded-card border border-card-border bg-card p-[18px]">
      <summary className="cursor-pointer text-[14px] font-semibold text-ink">
        Import progress from the old study app
      </summary>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft-62">
        Open the old app's Reading Path page, open the browser console (F12), run{" "}
        <code className="rounded bg-divider px-1">copy(localStorage.getItem("bom_progress"))</code>,
        then paste the result here. Chapters already marked read stay read.
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={4}
        placeholder='{"1-ne":{"1":true,"2":true}}'
        className="mt-3 w-full rounded-button border border-card-border bg-page/30 p-3 font-mono text-[12px] text-ink"
      />
      {error && <p className="mt-2 text-[13px] text-ink">{error}</p>}
      {importProgress.data && (
        <p className="mt-2 text-[13px] text-ink">
          Imported {importProgress.data.imported} chapters.
        </p>
      )}
      <PrimaryButton
        className="mt-3"
        onClick={submit}
        disabled={!raw.trim() || importProgress.isPending}
      >
        Import
      </PrimaryButton>
    </details>
  );
}
