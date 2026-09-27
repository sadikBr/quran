import "server-only";

import { eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { userKhatmahPlan, userWird } from "@/drizzle/schema";
import { buildAdaptiveKhatmahTarget } from "@/features/khatmah/server/calculate-khatmah";
import type { KhatmahMeasurement } from "@/features/khatmah/types";
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
        const [navigation, surahs, activePlans] = await Promise.all([
            getQuranNavigationMeta(),
            getSurahsMeta(),
            db
                .select()
                .from(userKhatmahPlan)
                .where(eq(userKhatmahPlan.userId, userId))
                .limit(1),
        ]);
        const plan = activePlans[0];
        if (!plan?.completedAt) {
            const nextCursor = Math.min(
                record.targetEndGlobalAyah + 1,
                TOTAL_QURAN_AYAHS,
            );
            const adaptive = plan?.isActive
                ? buildAdaptiveKhatmahTarget(
                      {
                          targetDate: plan.targetDate,
                          durationWeeks: plan.durationWeeks,
                          currentGlobalAyah: plan.currentGlobalAyah,
                          measurement: plan.measurement as KhatmahMeasurement,
                          restDays: plan.restDays,
                      },
                      currentDate,
                      navigation,
                      surahs,
                  )
                : null;
            if (adaptive && adaptive.targetDate !== plan?.targetDate) {
                await db
                    .update(userKhatmahPlan)
                    .set({ targetDate: adaptive.targetDate })
                    .where(eq(userKhatmahPlan.userId, userId));
            }
            const nextTarget =
                adaptive ??
                buildWirdTarget(
                    record.unit as WirdUnit,
                    record.amount,
                    record.targetEndGlobalAyah >= TOTAL_QURAN_AYAHS
                        ? 1
                        : nextCursor,
                    navigation,
                    surahs,
                );

            [record] = await db
                .update(userWird)
                .set({
                    unit: plan?.isActive ? plan.measurement : record.unit,
                    amount: adaptive?.amount ?? record.amount,
                    targetStartGlobalAyah: nextTarget.startGlobalAyah,
                    targetEndGlobalAyah: nextTarget.endGlobalAyah,
                    progressGlobalAyah: null,
                    targetDate: adaptive?.scheduledDate ?? currentDate,
                    completedAt: null,
                })
                .where(eq(userWird.userId, userId))
                .returning();
        }
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
        scheduledForFuture:
            record.completedAt === null && record.targetDate > currentDate,
        progressGlobalAyah: record.progressGlobalAyah,
        start,
        end,
    };
}
