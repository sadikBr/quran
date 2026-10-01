import "server-only";
import {
    parseTajweedChapter,
    type TajweedSegment,
} from "../helpers/quranpedia-tajweed";
import type { AyahType } from "../types";
import {
    createQuranpediaCache,
    QURANPEDIA_REVALIDATE_SECONDS,
} from "./fetch-quranpedia";
import getQuranCorpus from "./get-quran-corpus";

const cached = createQuranpediaCache<Map<number, TajweedSegment[]>>(114);

export default async function addTajweed(ayahs: AyahType[], edition: string) {
    if (edition !== "quranpedia.mushaf.11") return ayahs;
    const corpus = await getQuranCorpus("quranpedia.mushaf.2");
    const chapters = new Map(
        await Promise.all(
            [...new Set(ayahs.map((a) => a.surah.number))].map(
                async (number) => {
                    try {
                        const segments = await cached(
                            String(number),
                            async () => {
                                const response = await fetch(
                                    `https://quranpedia.net/surah/1/${number}/tajweed`,
                                    {
                                        next: {
                                            revalidate:
                                                QURANPEDIA_REVALIDATE_SECONDS,
                                        },
                                        signal: AbortSignal.timeout(30_000),
                                    },
                                );
                                if (!response.ok)
                                    throw new Error(
                                        "Tajweed source unavailable.",
                                    );
                                return parseTajweedChapter(
                                    await response.text(),
                                    number,
                                    corpus.surahs[number - 1].ayahs.map(
                                        (a) => a.text,
                                    ),
                                );
                            },
                        );
                        return [number, segments] as const;
                    } catch {
                        return [number, null] as const;
                    }
                },
            ),
        ),
    );
    return ayahs.map((ayah) => ({
        ...ayah,
        tajweed: chapters.get(ayah.surah.number)?.get(ayah.numberInSurah),
        tajweedUnavailable: !chapters.get(ayah.surah.number),
    }));
}
