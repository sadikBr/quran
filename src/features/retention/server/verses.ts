import "server-only";
import type { Riwayah } from "@/features/memorization/progress";
import getQuranCorpus from "@/features/quran/server/get-quran-corpus";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";
import type { ExerciseVerse } from "../types";

export async function exerciseVerses(
    riwayah: Riwayah,
): Promise<ExerciseVerse[]> {
    const corpus = await getQuranCorpus();
    if (riwayah === "warsh") {
        const chapters = await getWarshChapters();
        return chapters.flatMap((s) =>
            s.verses.map((v) => ({
                surahNumber: s.id,
                ayahNumber: v.number,
                text: v.text,
                surahName: corpus.surahs[s.id - 1].name,
                englishName: corpus.surahs[s.id - 1].englishName,
            })),
        );
    }
    return corpus.surahs.flatMap((s) =>
        s.ayahs.map((v) => ({
            surahNumber: s.number,
            ayahNumber: v.numberInSurah,
            text: v.text,
            surahName: s.name,
            englishName: s.englishName,
        })),
    );
}
