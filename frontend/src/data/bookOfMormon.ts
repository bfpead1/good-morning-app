// Book of Mormon chapters with verse counts, from the standalone study app (reading-path.html).

export type Book = {
  name: string;
  short: string;
  slug: string; // Gospel Library URL slug
  verses: number[]; // verse count per chapter
};

export const BOOKS: Book[] = [
  { name: "1 Nephi", short: "1 Ne", slug: "1-ne", verses: [20, 24, 31, 38, 22, 6, 35, 38, 6, 22, 36, 23, 42, 30, 36, 39, 55, 25, 24, 22, 26, 31] },
  { name: "2 Nephi", short: "2 Ne", slug: "2-ne", verses: [40, 30, 25, 35, 34, 18, 11, 25, 54, 25, 8, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 9, 22, 32, 30, 33, 35, 32, 14, 18, 21, 9, 15] },
  { name: "Jacob", short: "Jacob", slug: "jacob", verses: [19, 35, 14, 18, 77, 13, 27] },
  { name: "Enos", short: "Enos", slug: "enos", verses: [27] },
  { name: "Jarom", short: "Jarom", slug: "jarom", verses: [15] },
  { name: "Omni", short: "Omni", slug: "omni", verses: [30] },
  { name: "Words of Mormon", short: "W of M", slug: "w-of-m", verses: [18] },
  { name: "Mosiah", short: "Mosiah", slug: "mosiah", verses: [18, 41, 27, 30, 15, 7, 33, 21, 19, 22, 29, 37, 35, 12, 31, 15, 20, 35, 29, 26, 36, 16, 39, 25, 24, 39, 37, 20, 47] },
  { name: "Alma", short: "Alma", slug: "alma", verses: [33, 38, 27, 20, 62, 8, 27, 32, 34, 32, 46, 37, 31, 29, 19, 21, 39, 43, 36, 30, 23, 35, 18, 30, 17, 37, 30, 14, 17, 60, 38, 43, 23, 41, 16, 30, 47, 15, 19, 26, 15, 31, 54, 24, 24, 41, 36, 25, 30, 40, 37, 40, 23, 24, 35, 57, 36, 41, 13, 36, 21, 52, 17] },
  { name: "Helaman", short: "Hel", slug: "hel", verses: [34, 14, 37, 26, 52, 41, 29, 28, 41, 19, 38, 26, 39, 31, 17, 25] },
  { name: "3 Nephi", short: "3 Ne", slug: "3-ne", verses: [30, 19, 26, 33, 26, 30, 26, 25, 22, 19, 41, 48, 34, 27, 24, 20, 25, 39, 36, 46, 29, 17, 14, 18, 6, 21, 33, 40, 9, 2] },
  { name: "4 Nephi", short: "4 Ne", slug: "4-ne", verses: [49] },
  { name: "Mormon", short: "Morm", slug: "morm", verses: [19, 29, 22, 23, 24, 22, 10, 41, 37] },
  { name: "Ether", short: "Ether", slug: "ether", verses: [43, 25, 28, 19, 6, 30, 27, 26, 35, 34, 23, 41, 31, 31, 34] },
  { name: "Moroni", short: "Moro", slug: "moro", verses: [4, 3, 4, 3, 2, 9, 48, 30, 26, 34] },
];

export type Chapter = { book: Book; chapter: number; verses: number };

/** All 239 chapters in reading order. */
export const ALL_CHAPTERS: Chapter[] = BOOKS.flatMap((book) =>
  book.verses.map((verses, i) => ({ book, chapter: i + 1, verses })),
);

export const TOTAL_CHAPTERS = ALL_CHAPTERS.length;

const GL_BASE = "https://www.churchofjesuschrist.org/study/scriptures/bofm";

export function gospelLibraryUrl(slug: string, chapter?: number) {
  return chapter ? `${GL_BASE}/${slug}/${chapter}?lang=eng` : `${GL_BASE}/${slug}?lang=eng`;
}
