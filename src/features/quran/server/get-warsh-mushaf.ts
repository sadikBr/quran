import "server-only";

import type { QuranNavigationMeta } from "../navigation-types";
import type { WarshChapter, WarshMushaf, WarshVerse } from "../types";
import { createQuranpediaCache } from "./fetch-quranpedia";
import getQuranpediaMushaf from "./get-quranpedia-mushaf";
import { getWarshTajweed } from "./warsh-tajweed";

const PRINTED_DIVISION_MARKER = "۞";
const cached = createQuranpediaCache<WarshMushaf>(1);

function normalizeDivisionMetadata(mushaf: WarshMushaf): WarshMushaf {
    let juz = 1;
    let hizb = 1;
    let ruku = 1;
    let manzil = 1;

    const normalized = {
        ...mushaf,
        surahs: mushaf.surahs.map((surah) => ({
            ...surah,
            ayahs: surah.ayahs.map((ayah) => {
                if (ayah.juz > 0) juz = ayah.juz;
                if (ayah.hizb > 0) hizb = ayah.hizb;
                if (ayah.ruku > 0) ruku = ayah.ruku;
                if (ayah.manzil > 0) manzil = ayah.manzil;

                const tajweed = getWarshTajweed(
                    surah.id,
                    ayah.number,
                    ayah.text,
                );
                return {
                    ...ayah,
                    juz,
                    hizb,
                    ruku,
                    manzil,
                    tajweed,
                    tajweedUnavailable: !tajweed,
                };
            }),
        })),
    };
    const verses = normalized.surahs.flatMap((surah) => surah.ayahs);
    const approximateStarts = new Map<number, number>();

    for (const [index, ayah] of verses.entries()) {
        if (!approximateStarts.has(ayah.hizb)) {
            approximateStarts.set(ayah.hizb, index);
        }
    }

    const printedStarts = new Map<number, number>();
    let previousStart = 0;

    for (const [quarter, approximateStart] of [...approximateStarts].sort(
        ([a], [b]) => a - b,
    )) {
        if (quarter === 1) {
            printedStarts.set(quarter, 0);
            continue;
        }

        let printedStart: number | undefined;
        for (let index = approximateStart; index > previousStart; index -= 1) {
            const ayah = verses[index];
            if (
                ayah.text.includes(PRINTED_DIVISION_MARKER) ||
                ayah.number === 1
            ) {
                printedStart = index;
                break;
            }
        }

        const start =
            printedStart ?? Math.max(previousStart + 1, approximateStart - 1);
        printedStarts.set(quarter, start);
        previousStart = start;
    }

    const quarterAtVerse = new Map<number, number>();
    for (const [quarter, start] of printedStarts) {
        quarterAtVerse.set(start, quarter);
    }

    let currentQuarter = 1;
    const correctedById = new Map<number, WarshVerse>();
    for (const [index, ayah] of verses.entries()) {
        currentQuarter = quarterAtVerse.get(index) ?? currentQuarter;
        correctedById.set(ayah.id, {
            ...ayah,
            hizb: currentQuarter,
            juz: Math.ceil(currentQuarter / 8),
        });
    }

    return {
        ...normalized,
        surahs: normalized.surahs.map((surah) => ({
            ...surah,
            ayahs: surah.ayahs.map(
                (ayah) => correctedById.get(ayah.id) ?? ayah,
            ),
        })),
    };
}

export default function getWarshMushaf(): Promise<WarshMushaf> {
    return cached("warsh", async () =>
        normalizeDivisionMetadata(await getQuranpediaMushaf(4)),
    );
}

export async function getWarshChapters(): Promise<WarshChapter[]> {
    const mushaf = await getWarshMushaf();
    return mushaf.surahs.map((surah) => ({
        id: surah.id,
        name: surah.name,
        coded_name: surah.coded_name,
        verses: surah.ayahs,
    }));
}

export async function getWarshChapter(
    surahNumber: number,
): Promise<WarshChapter> {
    const chapters = await getWarshChapters();
    const chapter = chapters.find((item) => item.id === surahNumber);
    if (!chapter) throw new Error(`Warsh surah ${surahNumber} was not found.`);
    return chapter;
}

export async function getWarshPageVerses(page: number) {
    const chapters = await getWarshChapters();
    return chapters.flatMap((chapter) =>
        chapter.verses
            .filter((verse) => verse.page_number === page)
            .map((verse) => ({ chapter, verse })),
    );
}

function firstAtEachBoundary(
    verses: WarshVerse[],
    value: (verse: WarshVerse) => number,
) {
    const references = new Map<number, WarshVerse>();
    for (const verse of verses) {
        const number = value(verse);
        if (!references.has(number)) references.set(number, verse);
    }
    return references;
}

export async function getWarshNavigationMeta(): Promise<QuranNavigationMeta> {
    const chapters = await getWarshChapters();
    const verses = chapters.flatMap((chapter) => chapter.verses);

    function reference(number: number, verse: WarshVerse) {
        return {
            number,
            surahNumber: Number(verse.surah),
            ayahNumber: verse.number,
            globalAyahNumber: verse.id,
            pageNumber: verse.page_number,
        };
    }

    const pages = [...firstAtEachBoundary(verses, (verse) => verse.page_number)]
        .sort(([a], [b]) => a - b)
        .map(([number, verse]) => reference(number, verse));
    const quarters = [...firstAtEachBoundary(verses, (verse) => verse.hizb)]
        .sort(([a], [b]) => a - b)
        .map(([number, verse]) => reference(number, verse));
    const juzs = quarters
        .filter((quarter) => (quarter.number - 1) % 8 === 0)
        .map((quarter) => ({
            ...quarter,
            number: Math.ceil(quarter.number / 8),
        }));
    const hizbs = quarters
        .filter((quarter) => (quarter.number - 1) % 4 === 0)
        .map((quarter) => ({
            ...quarter,
            number: Math.ceil(quarter.number / 4),
        }));

    return { pages, juzs, hizbs, hizbQuarters: quarters };
}
