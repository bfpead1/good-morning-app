// Learning Mode quiz bank, ported from the study app's quiz-data.js.
// The bank (public/quiz/bom_quiz_corrected.txt) is pipe-delimited with 9 columns:
// Book|Chapter|Question|A|B|C|D|Correct|Reference. It's only fetched when a quiz opens.
import { BOOKS, gospelLibraryUrl } from "../data/bookOfMormon";

export const QUESTIONS_PER_CHAPTER = 5;
export const PASS_THRESHOLD = 4; // out of QUESTIONS_PER_CHAPTER

export type Letter = "A" | "B" | "C" | "D";
export type QuizQuestion = {
  question: string;
  options: Record<Letter, string>;
  correct: Letter;
  reference: string;
};
export type QuizBank = Map<string, QuizQuestion[]>;

const QUIZ_URL = "/quiz/bom_quiz_corrected.txt";

/**
 * Some fields were exported spreadsheet-style: wrapped in quotes with inner quotes
 * doubled ("Lehi said ""arise"""). Unwrap those so they display cleanly.
 */
function cleanField(raw: string) {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/""/g, '"');
  }
  return s;
}

/** Map keyed by "Book|Chapter". Malformed rows are logged and skipped, never thrown. */
export function parseQuizBank(text: string): QuizBank {
  const lines = text.split("\n");
  const byChapter: QuizBank = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (!line.trim()) continue;
    const f = line.split("|");
    if (f.length !== 9) {
      console.warn(`[quiz] Bad row at line ${i + 1}: expected 9 fields, got ${f.length}`);
      continue;
    }
    const [book, chapterStr, question, a, b, c, d, correct, reference] = f.map(cleanField);
    if (!["A", "B", "C", "D"].includes(correct)) {
      console.warn(`[quiz] Bad answer key at line ${i + 1}: "${correct}"`);
      continue;
    }
    const chapter = Number(chapterStr);
    if (!Number.isInteger(chapter) || chapter < 1) {
      console.warn(`[quiz] Bad chapter number at line ${i + 1}: "${chapterStr}"`);
      continue;
    }
    const key = `${book}|${chapter}`;
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key)!.push({
      question,
      options: { A: a, B: b, C: c, D: d },
      correct: correct as Letter,
      reference,
    });
  }
  return byChapter;
}

// Fetched and parsed once per page load; a failed load can be retried.
let bankPromise: Promise<QuizBank> | null = null;

export function loadQuizBank() {
  bankPromise ??= fetch(QUIZ_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Quiz data request failed (${res.status})`);
      return res.text();
    })
    .then(parseQuizBank)
    .catch((err) => {
      bankPromise = null;
      throw err;
    });
  return bankPromise;
}

/** The chapter's questions in random order. Throws if the bank is missing any. */
export function questionsFor(bank: QuizBank, bookName: string, chapter: number) {
  const questions = bank.get(`${bookName}|${chapter}`) ?? [];
  if (questions.length < QUESTIONS_PER_CHAPTER) {
    throw new Error(`${bookName} ${chapter} has ${questions.length} quiz question(s), expected ${QUESTIONS_PER_CHAPTER}`);
  }
  return shuffle(questions);
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Longest names first so "Words of Mormon" wins over "Mormon".
const BOOKS_BY_NAME_LENGTH = [...BOOKS].sort((a, b) => b.name.length - a.name.length);

/**
 * Gospel Library link for a reference like "1 Nephi 1:6-8", jumping to the verses.
 * Extra text after the reference ("(heading)", "; general narrative") is ignored.
 */
export function referenceUrl(reference: string): string | null {
  const book = BOOKS_BY_NAME_LENGTH.find((b) => reference.startsWith(`${b.name} `));
  if (!book) return null;
  const m = reference.slice(book.name.length + 1).match(/^(\d+)(?::(\d+)(?:-(\d+))?)?/);
  if (!m) return null;
  const chapter = Number(m[1]);
  const base = gospelLibraryUrl(book.slug, chapter);
  if (!m[2]) return base;
  const range = m[3] ? `p${m[2]}-p${m[3]}` : `p${m[2]}`;
  return `${base}&id=${range}#p${m[2]}`;
}
