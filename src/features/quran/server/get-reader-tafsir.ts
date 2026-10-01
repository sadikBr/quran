import "server-only";

import type { Riwayah } from "@/features/settings/preferences";
import { getQuranpediaEdition } from "../quranpedia-editions";
import getAyah from "./get-ayah";
import getSurahData from "./get-surah";
import getWarshChapter from "./get-warsh-chapter";

export default async function getReaderTafsir(
    surahNumber: number,
    ayahNumber: number,
    riwayah: Riwayah,
    editionIdentifier: string,
) {
    if (
        !Number.isInteger(surahNumber) ||
        surahNumber < 1 ||
        surahNumber > 114 ||
        !Number.isInteger(ayahNumber) ||
        ayahNumber < 1 ||
        (riwayah !== "hafs" && riwayah !== "warsh")
    ) {
        throw new Error("Invalid Quran verse.");
    }
    if (getQuranpediaEdition(editionIdentifier).type !== "tafsir") {
        throw new Error("That tafsir edition is not available.");
    }

    const [{ ayahs }, chapter] = await Promise.all([
        getSurahData(String(surahNumber)),
        riwayah === "warsh" ? getWarshChapter(surahNumber) : null,
    ]);
    const verse = chapter?.verses.find((item) => item.number === ayahNumber);
    if (riwayah === "warsh" && !verse) {
        throw new Error("Invalid Warsh verse.");
    }
    // The first Warsh verse is Al-hamdu lillah. Quranpedia also maps the
    // unnumbered basmala to it; that prefatory text is not the selected verse.
    const references = verse
        ? surahNumber === 1 && ayahNumber === 1
            ? [2]
            : verse.number_in_hafs
        : [ayahNumber];
    const mapped = [...new Set(references)]
        .sort((a, b) => a - b)
        .map((number) => {
            const ayah = ayahs.find((item) => item.numberInSurah === number);
            if (!ayah) throw new Error("Missing tafsir verse reference.");
            return ayah;
        });
    if (!mapped.length) throw new Error("Missing tafsir verse reference.");
    const commentary = await Promise.all(
        mapped.map((ayah) => getAyah(ayah.number, editionIdentifier)),
    );
    // A book may return the same passage for several adjacent verses.
    return {
        ...commentary[0],
        text: [
            ...new Set(commentary.map((item) => item.text).filter(Boolean)),
        ].join("\n\n"),
    };
}
