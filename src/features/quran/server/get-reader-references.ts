import "server-only";

import type { Riwayah } from "@/features/settings/preferences";
import getSurahData from "./get-surah";
import getWarshChapter from "./get-warsh-chapter";

/** Resolve all canonical references without changing the displayed riwayah. */
export default async function getReaderReferences(
    surahNumber: number,
    ayahNumber: number,
    riwayah: Riwayah,
) {
    if (
        !Number.isInteger(surahNumber) ||
        surahNumber < 1 ||
        surahNumber > 114 ||
        !Number.isInteger(ayahNumber) ||
        ayahNumber < 1 ||
        ayahNumber > 286 ||
        (riwayah !== "hafs" && riwayah !== "warsh")
    )
        throw new Error("Invalid Quran verse.");

    const [{ ayahs }, chapter] = await Promise.all([
        getSurahData(String(surahNumber)),
        riwayah === "warsh" ? getWarshChapter(surahNumber) : null,
    ]);
    const verse = chapter?.verses.find((item) => item.number === ayahNumber);
    if (riwayah === "warsh" && !verse) throw new Error("Invalid Warsh verse.");
    // Warsh Al-Fatiha 1 is Al-hamdu lillah, excluding the unnumbered basmala.
    const references = verse
        ? surahNumber === 1 && ayahNumber === 1
            ? [2]
            : verse.number_in_hafs
        : [ayahNumber];
    if (!references.length) throw new Error("Missing Quran verse reference.");
    return [...new Set(references)]
        .sort((a, b) => a - b)
        .map((number) => {
            const ayah = ayahs.find((item) => item.numberInSurah === number);
            if (!ayah) throw new Error("Missing Quran verse reference.");
            return ayah;
        });
}
