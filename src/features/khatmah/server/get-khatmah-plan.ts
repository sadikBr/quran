import "server-only";

import { eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { userKhatmahPlan } from "@/drizzle/schema";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import { TOTAL_QURAN_AYAHS } from "@/features/wird/server/build-wird-target";
import getWirdDate from "@/features/wird/server/wird-date";
import type { KhatmahMeasurement, KhatmahPlan } from "../types";
import {
    buildAdaptiveKhatmahTarget,
    countCalendarDays,
} from "./calculate-khatmah";

export default async function getKhatmahPlan(
    userId: string,
): Promise<KhatmahPlan | null> {
    let record: typeof userKhatmahPlan.$inferSelect | undefined;
    try {
        [record] = await db
            .select()
            .from(userKhatmahPlan)
            .where(eq(userKhatmahPlan.userId, userId))
            .limit(1);
    } catch {
        return null;
    }
    if (!record) return null;

    const currentDate = getWirdDate();
    const navigation = await getQuranNavigationMeta();
    const adaptive = buildAdaptiveKhatmahTarget(
        {
            targetDate: record.targetDate,
            durationWeeks: record.durationWeeks,
            currentGlobalAyah: record.currentGlobalAyah,
            measurement: record.measurement as KhatmahMeasurement,
            restDays: record.restDays,
        },
        currentDate,
        navigation,
        [],
    );
    if (adaptive.targetDate !== record.targetDate && record.isActive) {
        await db
            .update(userKhatmahPlan)
            .set({ targetDate: adaptive.targetDate })
            .where(eq(userKhatmahPlan.userId, userId));
    }
    const totalPlanAyahs = TOTAL_QURAN_AYAHS - record.startGlobalAyah + 1;
    const completedAyahs = Math.max(
        0,
        Math.min(
            totalPlanAyahs,
            record.currentGlobalAyah - record.startGlobalAyah,
        ),
    );

    return {
        targetDate: adaptive.targetDate,
        durationWeeks: record.durationWeeks,
        repeatable: record.repeatable,
        startGlobalAyah: record.startGlobalAyah,
        currentGlobalAyah: record.currentGlobalAyah,
        measurement: record.measurement as KhatmahMeasurement,
        restDays: record.restDays,
        isActive: record.isActive,
        completed: record.completedAt !== null,
        progressPercentage: Math.round((completedAyahs / totalPlanAyahs) * 100),
        remainingDays: countCalendarDays(currentDate, adaptive.targetDate),
        readingDaysRemaining: adaptive.readingDays,
        dailyAmount: adaptive.amount,
        nextReadingDate: adaptive.scheduledDate,
    };
}
