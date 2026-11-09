import { useCallback, useEffect, useState } from "react";
import type { Book } from "../data/bookOfMormon";
import {
  type Letter,
  loadQuizBank,
  PASS_THRESHOLD,
  type QuizQuestion,
  questionsFor,
  referenceUrl,
} from "../lib/quiz";
import { useMarkChapters } from "../lib/scripture";
import { PrimaryButton, SecondaryButton } from "./PrimaryButton";

const LETTERS: Letter[] = ["A", "B", "C", "D"];

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "question"; questions: QuizQuestion[]; index: number; picked: Letter | null; missed: QuizQuestion[] }
  | { phase: "result"; total: number; missed: QuizQuestion[] };

function Reference({ reference }: { reference: string }) {
  const url = referenceUrl(reference);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">
      {reference}
    </a>
  ) : (
    <span>{reference}</span>
  );
}

/**
 * Learning Mode quiz for one chapter. Passing (PASS_THRESHOLD of 5) marks the chapter read.
 * A failed attempt never un-marks a chapter that was already read.
 */
export function QuizModal({ book, chapter, onClose }: { book: Book; chapter: number; onClose: () => void }) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const mark = useMarkChapters();

  const load = useCallback(() => {
    loadQuizBank()
      .then((bank) =>
        setState({ phase: "question", questions: questionsFor(bank, book.name, chapter), index: 0, picked: null, missed: [] }),
      )
      .catch((err: Error) => setState({ phase: "error", message: err.message }));
  }, [book.name, chapter]);

  useEffect(load, [load]);

  /** Retry after an error, or retake after a failed attempt (questions reshuffle). */
  function start() {
    setState({ phase: "loading" });
    load();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(letter: Letter) {
    if (state.phase !== "question" || state.picked) return;
    const q = state.questions[state.index];
    setState({ ...state, picked: letter, missed: letter === q.correct ? state.missed : [...state.missed, q] });
  }

  function next() {
    if (state.phase !== "question") return;
    if (state.index + 1 < state.questions.length) {
      setState({ ...state, index: state.index + 1, picked: null });
      return;
    }
    const total = state.questions.length;
    if (total - state.missed.length >= PASS_THRESHOLD) {
      mark.mutate({ chapters: [{ slug: book.slug, chapter }], completed: true, via: "quiz" });
    }
    setState({ phase: "result", total, missed: state.missed });
  }

  const title = `${book.name} ${chapter}`;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 md:items-center md:p-6" onClick={onClose} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} quiz`}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] md:max-w-[560px] md:rounded-[20px] md:shadow-xl bg-card p-6 pb-[max(24px,env(safe-area-inset-bottom))]"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[20px] font-medium text-ink">{title}</h2>
          <div className="flex items-baseline gap-4">
            {state.phase === "question" && (
              <span className="text-[13px] text-ink-soft-55">
                {state.index + 1} / {state.questions.length}
              </span>
            )}
            <button type="button" onClick={onClose} className="text-[14px] font-semibold text-ink-soft-62">
              Close
            </button>
          </div>
        </div>

        {state.phase === "loading" && <p className="text-[14px] text-ink-soft-62">Loading quiz…</p>}

        {state.phase === "error" && (
          <div>
            <p className="mb-4 text-[14px] leading-relaxed text-ink">
              This chapter's quiz couldn't be loaded ({state.message}). You can still mark it read.
            </p>
            <div className="flex gap-3">
              <SecondaryButton onClick={start}>Try again</SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  mark.mutate({ chapters: [{ slug: book.slug, chapter }], completed: true });
                  onClose();
                }}
              >
                Mark read
              </PrimaryButton>
            </div>
          </div>
        )}

        {state.phase === "question" &&
          (() => {
            const q = state.questions[state.index];
            const isLast = state.index + 1 >= state.questions.length;
            return (
              <div>
                <p className="mb-4 text-[16px] leading-relaxed text-ink">{q.question}</p>
                <div className="mb-4 space-y-2">
                  {LETTERS.map((letter) => {
                    const answered = state.picked !== null;
                    const style = !answered
                      ? "border-card-border bg-page/30"
                      : letter === q.correct
                        ? "border-ink bg-accent font-semibold"
                        : letter === state.picked
                          ? "border-ink/40 bg-divider line-through"
                          : "border-card-border opacity-60";
                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={answered}
                        onClick={() => pick(letter)}
                        className={`w-full rounded-button border px-4 py-3 text-left text-[14.5px] text-ink ${style}`}
                      >
                        {q.options[letter]}
                      </button>
                    );
                  })}
                </div>
                {state.picked && (
                  <>
                    <p className="mb-4 rounded-button bg-page/40 p-3 text-[13.5px] leading-relaxed text-ink">
                      {state.picked === q.correct ? "✓ Correct!" : "✗ Not quite."} Reference:{" "}
                      <Reference reference={q.reference} />
                    </p>
                    <PrimaryButton onClick={next}>{isLast ? "See results" : "Next question"}</PrimaryButton>
                  </>
                )}
              </div>
            );
          })()}

        {state.phase === "result" &&
          (() => {
            const correct = state.total - state.missed.length;
            const passed = correct >= PASS_THRESHOLD;
            return (
              <div>
                <p className="text-center font-display text-[32px] font-medium text-ink">
                  {correct} / {state.total}
                </p>
                <p className="mb-4 text-center text-[15px] text-ink">
                  {passed
                    ? "Passed — chapter marked read!"
                    : `You need ${PASS_THRESHOLD} of ${state.total} to pass. Review and try again.`}
                </p>
                {state.missed.length > 0 && (
                  <ul className="mb-4 space-y-2">
                    {state.missed.map((q) => (
                      <li key={q.question} className="rounded-button bg-page/40 p-3 text-[13.5px] leading-relaxed text-ink">
                        {q.question}
                        <br />
                        <span className="text-ink-soft-62">Answer: {q.options[q.correct]} · </span>
                        <Reference reference={q.reference} />
                      </li>
                    ))}
                  </ul>
                )}
                {passed ? (
                  <PrimaryButton onClick={onClose}>Continue</PrimaryButton>
                ) : (
                  <div className="flex gap-3">
                    <SecondaryButton onClick={onClose}>Close</SecondaryButton>
                    <PrimaryButton onClick={start}>Retry</PrimaryButton>
                  </div>
                )}
              </div>
            );
          })()}
      </div>
    </div>
  );
}
