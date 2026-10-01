export const STUDY_SECTIONS = [
    "tafsir",
    "meanings",
    "translations",
    "asbab",
    "similar",
    "topics",
    "e3rab",
    "notes",
] as const;

export type StudySection = (typeof STUDY_SECTIONS)[number];
export type StudyBook = { id: number; name: string; author?: string };
export type StudyLanguage = {
    code: string;
    name: string;
    localName: string;
    direction: "rtl" | "ltr";
};
export type StudyPassage = {
    text: string;
    references: number[];
    page?: number;
    part?: number;
};
export type StudyTranslation = StudyBook & {
    passages: StudyPassage[];
};
export type SimilarVerse = {
    surah: number;
    ayah: number;
    globalNumber: number;
    surahName: string;
    surahEnglishName: string;
    text: string;
};
export type StudyTopic = {
    id: number;
    name: string;
    path: string[];
    verseCount: number;
};
export type StudyNote = {
    text: string;
    attribution?: string;
    category?: string;
    references: number[];
    hasAttachments: boolean;
};
export const SIMILAR_GROUPS = [
    "similar",
    "beginning",
    "ending",
    "identical",
    "phrases",
] as const;
export type SimilarGroup = (typeof SIMILAR_GROUPS)[number];

export type AyahStudyData = {
    references: number[];
    sourceUrl: string;
} & (
    | {
          section: "tafsir" | "asbab" | "e3rab";
          books: StudyBook[];
          selectedBook?: StudyBook;
          passages: StudyPassage[];
      }
    | {
          section: "meanings";
          books: StudyBook[];
          selectedBook?: StudyBook;
          meanings: { word: string; meaning: string; references: number[] }[];
      }
    | {
          section: "translations";
          languages: StudyLanguage[];
          language: string;
          translations: StudyTranslation[];
      }
    | {
          section: "similar";
          groups: { type: SimilarGroup; verses: SimilarVerse[] }[];
      }
    | {
          section: "topics";
          topics: StudyTopic[];
          topicId?: number;
          verses: SimilarVerse[];
      }
    | {
          section: "notes";
          notes: StudyNote[];
      }
);

export function studySourceUrl(
    surah: number,
    ayah: number,
    section: StudySection,
    book?: number,
) {
    const params = new URLSearchParams({
        surah: String(surah),
        ayah: String(ayah),
        type: section,
    });
    if (book) params.set("book", String(book));
    return `https://api.quranpedia.net/embed?${params}`;
}
