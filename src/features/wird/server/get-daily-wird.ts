import "server-only";

import { eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { userWird } from "@/drizzle/schema";
import getAyah from "@/features/quran/server/get-ayah";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import type { DailyWird, WirdLocation, WirdUnit } from "../types";
import buildWirdTarget, { TOTAL_QURAN_AYAHS } from "./build-wird-target";
import getWirdDate from "./wird-date";

async function location(globalAyahNumber: number, edition: string) {
    const ayah = await getAyah(globalAyahNumber, edition);

    return {
        globalAyahNumber,
        surahNumber: ayah.surah.number,
        surahName: ayah.surah.name,
        englishSurahName: ayah.surah.englishName,
        ayahNumber: ayah.numberInSurah,
        pageNumber: ayah.page,
    } satisfies WirdLocation;
}

export default async function getDailyWird(
    userId: string,
    arabicEdition: string,
): Promise<DailyWird | null> {
    let record: typeof userWird.$inferSelect | undefined;

    try {
        [record] = await db
            .select()
            .from(userWird)
            .where(eq(userWird.userId, userId))
            .limit(1);
    } catch {
        return null;
    }

    if (!record) return null;

    const currentDate = getWirdDate();
    const completedOn = record.completedAt
        ? getWirdDate(record.completedAt)
        : null;

    if (completedOn && completedOn < currentDate) {
        const [navigation, surahs] = await Promise.all([
            getQuranNavigationMeta(),
            getSurahsMeta(),
        ]);
        const nextCursor =
            record.targetEndGlobalAyah >= TOTAL_QURAN_AYAHS
                ? 1
                : record.targetEndGlobalAyah + 1;
        const nextTarget = buildWirdTarget(
            record.unit as WirdUnit,
            record.amount,
            nextCursor,
            navigation,
            surahs,
        );

        [record] = await db
            .update(userWird)
            .set({
                targetStartGlobalAyah: nextTarget.startGlobalAyah,
                targetEndGlobalAyah: nextTarget.endGlobalAyah,
                progressGlobalAyah: null,
                targetDate: currentDate,
                completedAt: null,
            })
            .where(eq(userWird.userId, userId))
            .returning();
    }

    const [start, end] = await Promise.all([
        location(record.targetStartGlobalAyah, arabicEdition),
        location(record.targetEndGlobalAyah, arabicEdition),
    ]);

    return {
        unit: record.unit as WirdUnit,
        amount: record.amount,
        targetDate: record.targetDate,
        completed: record.completedAt !== null,
        carriedOver:
            record.completedAt === null && record.targetDate < currentDate,
        progressGlobalAyah: record.progressGlobalAyah,
        start,
        end,
    };
}
