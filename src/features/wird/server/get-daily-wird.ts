import "server-only";

import { eq, getTableColumns, sql } from "drizzle-orm";
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
    const columns = {
        ...getTableColumns(userWird),
        revision: sql<string>`${userWird.updatedAt}::text`,
    };
    let record:
        | (typeof userWird.$inferSelect & { revision: string })
        | undefined;

    [record] = await db
        .select(columns)
        .from(userWird)
        .where(eq(userWird.userId, userId))
        .limit(1);

    if (!record) return null;

    const currentDate = getWirdDate();
    const completedOn = record.completedAt
        ? getWirdDate(record.completedAt)
        : null;

    if (completedOn && completedOn < currentDate) {
        // Fetch remote data before locking. Another request may advance the
        // portion while this is in flight, so re-read it inside the transaction.
        const [navigation, surahs] = await Promise.all([
            getQuranNavigationMeta(),
            getSurahsMeta(),
        ]);
        record = await db.transaction(async (tx) => {
            const [current] = await tx
                .select(columns)
                .from(userWird)
                .where(eq(userWird.userId, userId))
                .for("update");
            const today = getWirdDate();
            if (
                !current?.completedAt ||
                getWirdDate(current.completedAt) >= today
            )
                return current;

            // Match completion and plan editing: lock the portion before its plan.
            const [plan] = await tx
                .select()
                .from(userKhatmahPlan)
                .where(eq(userKhatmahPlan.userId, userId))
                .for("update");
            if (plan?.completedAt && !current.nextGoal) return current;
            const nextCursor = Math.min(
                current.targetEndGlobalAyah + 1,
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
                      today,
                      navigation,
                      surahs,
                  )
                : null;
            if (adaptive && adaptive.targetDate !== plan?.targetDate) {
                await tx
                    .update(userKhatmahPlan)
                    .set({ targetDate: adaptive.targetDate })
                    .where(eq(userKhatmahPlan.userId, userId));
            }
            const nextTarget =
                adaptive ??
                buildWirdTarget(
                    (current.nextGoal?.unit ?? current.unit) as WirdUnit,
                    current.nextGoal?.amount ?? current.amount,
                    current.targetEndGlobalAyah >= TOTAL_QURAN_AYAHS
                        ? 1
                        : nextCursor,
                    navigation,
                    surahs,
                );

            const [advanced] = await tx
                .update(userWird)
                .set({
                    unit: plan?.isActive
                        ? plan.measurement
                        : (current.nextGoal?.unit ?? current.unit),
                    amount:
                        adaptive?.amount ??
                        current.nextGoal?.amount ??
                        current.amount,
                    targetStartGlobalAyah: nextTarget.startGlobalAyah,
                    targetEndGlobalAyah: nextTarget.endGlobalAyah,
                    progressGlobalAyah: null,
                    progressVerse: null,
                    targetDate: adaptive?.scheduledDate ?? today,
                    completedAt: null,
                    updatedAt: sql`greatest(clock_timestamp(), ${userWird.updatedAt} + interval '1 microsecond')`,
                })
                .where(eq(userWird.userId, userId))
                .returning(columns);
            return advanced;
        });
    }

    if (!record) return null;

    const [start, end] = await Promise.all([
        location(record.targetStartGlobalAyah, arabicEdition),
        location(record.targetEndGlobalAyah, arabicEdition),
    ]);

    return {
        unit: record.unit as WirdUnit,
        revision: record.revision,
        amount: record.amount,
        targetDate: record.targetDate,
        completed: record.completedAt !== null,
        carriedOver:
            record.completedAt === null && record.targetDate < currentDate,
        scheduledForFuture:
            record.completedAt === null && record.targetDate > currentDate,
        progressGlobalAyah: record.progressGlobalAyah,
        progressVerse: record.progressVerse,
        nextGoal: record.nextGoal,
        start,
        end,
    };
}
