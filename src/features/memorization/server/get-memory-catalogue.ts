import "server-only";
import { createQuranpediaCache } from "@/features/quran/server/fetch-quranpedia";
import getQuranCorpus from "@/features/quran/server/get-quran-corpus";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";
import type { MemoryCatalogue, MemoryVerse } from "../progress";

const cached = createQuranpediaCache<MemoryCatalogue>(1);
export default function getMemoryCatalogue() {
    return cached("coverage", async () => {
        const [hafs, warsh] = await Promise.all([
            getQuranCorpus(),
            getWarshChapters(),
        ]);
        const hafsAtoms = new Map<string, Set<string>>();
        const warshVerses: MemoryVerse[] = warsh.flatMap((surah) =>
            surah.verses.map((verse) => {
                const atoms = [...new Set(verse.number_in_hafs)].map(
                    (number) => {
                        if (!hafs.surahs[surah.id - 1]?.ayahs[number - 1])
                            throw new Error(
                                "Invalid memorization correspondence.",
                            );
                        const key = `${surah.id}:${number}`;
                        const atom = `${key}:${verse.number}`;
                        const previous =
                            hafsAtoms.get(key) ?? new Set<string>();
                        previous.add(atom);
                        hafsAtoms.set(key, previous);
                        return atom;
                    },
                );
                if (!atoms.length)
                    throw new Error("Missing memorization correspondence.");
                return {
                    surahNumber: surah.id,
                    ayahNumber: verse.number,
                    hizb: Math.ceil(verse.hizb / 4),
                    page: verse.page_number,
                    atoms,
                };
            }),
        );
        const hafsVerses = hafs.surahs.flatMap((surah) =>
            surah.ayahs.map((verse) => {
                const key = `${verse.surah.number}:${verse.numberInSurah}`;
                return {
                    surahNumber: verse.surah.number,
                    ayahNumber: verse.numberInSurah,
                    hizb: Math.ceil(verse.hizbQuarter / 4),
                    page: verse.page,
                    atoms: [...(hafsAtoms.get(key) ?? [key])],
                };
            }),
        );
        return { hafs: hafsVerses, warsh: warshVerses };
    });
}
