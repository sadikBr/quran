"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { quranReferenceSchema } from "@/features/practice/types";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahData from "@/features/quran/server/get-surah";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import {
    getWarshChapters,
    getWarshNavigationMeta,
} from "@/features/quran/server/get-warsh-mushaf";
import getPreferences from "@/features/settings/server/get-preferences";
import { continuationReferences, randomStartPool } from "../random-start";
import getMemorizationProgress from "./get-memorization-progress";

const schema = z.object({
    continuationCount: z.number().int().min(1).max(30).optional().default(5),
    range: z
        .object({ start: quranReferenceSchema, end: quranReferenceSchema })
        .optional(),
    previous: quranReferenceSchema.optional(),
});

export default async function getRandomStart(input: z.input<typeof schema>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "error" as const };
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { error: "invalid" as const };
    try {
        const preferences = await getPreferences();
        const warsh = preferences.riwayah === "warsh";
        const [meta, chapters, navigation, completed] = await Promise.all([
            getSurahsMeta(),
            warsh ? getWarshChapters() : Promise.resolve(null),
            warsh ? getWarshNavigationMeta() : getQuranNavigationMeta(),
            getMemorizationProgress(session.user.id),
        ]);
        const surahs = meta.map((surah) => ({
            ...surah,
            numberOfAyahs:
                chapters?.find((chapter) => chapter.id === surah.number)?.verses
                    .length ?? surah.numberOfAyahs,
        }));
        const { range, previous } = parsed.data;
        if (
            range &&
            [range.start, range.end].some(
                (point) =>
                    point.ayahNumber >
                    (surahs.find((surah) => surah.number === point.surahNumber)
                        ?.numberOfAyahs ?? 0),
            )
        )
            return { error: "invalid" as const };
        const pool = randomStartPool(surahs, navigation, completed, range);
        if (!pool.length)
            return {
                error: range
                    ? ("invalid" as const)
                    : completed.length
                      ? ("error" as const)
                      : ("empty" as const),
            };
        const alternatives = pool.filter(
            (point) =>
                point.surahNumber !== previous?.surahNumber ||
                point.ayahNumber !== previous?.ayahNumber,
        );
        const choices = alternatives.length ? alternatives : pool;
        const start = choices[randomInt(choices.length)];
        const references = continuationReferences(
            pool,
            start,
            parsed.data.continuationCount,
            surahs,
        );
        const surah = surahs.find((item) => item.number === start.surahNumber);
        if (!surah) return { error: "error" as const };
        const groups = await Promise.all(
            [...new Set(references.map((point) => point.surahNumber))].map(
                async (number) => {
                    const metadata = surahs.find(
                        (item) => item.number === number,
                    );
                    const verses = chapters
                        ? chapters
                              .find((chapter) => chapter.id === number)
                              ?.verses.map((verse) => ({
                                  number: verse.number,
                                  text: verse.text,
                              }))
                        : (
                              await getSurahData(
                                  String(number),
                                  "quran-uthmani",
                              )
                          ).ayahs.map((verse) => ({
                              number: verse.numberInSurah,
                              text: verse.text,
                          }));
                    if (!metadata || !verses)
                        throw new Error("Missing Quran text");
                    return verses
                        .filter((verse) =>
                            references.some(
                                (point) =>
                                    point.surahNumber === number &&
                                    point.ayahNumber === verse.number,
                            ),
                        )
                        .map((verse) => ({
                            ...verse,
                            surahNumber: number,
                            surahName:
                                preferences.language === "ar"
                                    ? metadata.name
                                    : metadata.englishName,
                        }));
                },
            ),
        );
        const verses = groups.flat();
        if (verses.length !== references.length)
            return { error: "error" as const };
        return {
            result: {
                riwayah: preferences.riwayah,
                start,
                name:
                    preferences.language === "ar"
                        ? surah.name
                        : surah.englishName,
                verses,
                requestedCount: parsed.data.continuationCount,
            },
        };
    } catch {
        return { error: "error" as const };
    }
}
