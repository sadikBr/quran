"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userKhatmahPlan, userWird, userWirdHistory } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getWirdDate from "@/features/wird/server/wird-date";
import { khatmahPlanSchema } from "../types";
import { buildAdaptiveKhatmahTarget, shiftDate } from "./calculate-khatmah";

export default async function updateKhatmahPlan(input: unknown) {
    const parsed = khatmahPlanSchema.safeParse(input);
    const currentDate = getWirdDate();
    if (!parsed.success) {
        return { success: false as const, message: "Invalid Khatmah plan." };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, message: "Sign in required." };
    }

    try {
        const [surahs, navigation, existingWird] = await Promise.all([
            getSurahsMeta(),
            getQuranNavigationMeta(),
            db
                .select()
                .from(userWird)
                .where(eq(userWird.userId, session.user.id))
                .limit(1),
        ]);
        let offset = 1;
        for (const surah of surahs) {
            if (surah.number === parsed.data.startSurah) break;
            offset += surah.numberOfAyahs;
        }
        const existing = existingWird[0];
        const completedToday =
            existing?.completedAt &&
            getWirdDate(existing.completedAt) === currentDate;
        const planningDate = completedToday
            ? shiftDate(currentDate, 1)
            : currentDate;
        const targetDate = shiftDate(
            planningDate,
            parsed.data.durationWeeks * 7,
        );
        const adaptive = buildAdaptiveKhatmahTarget(
            {
                targetDate,
                durationWeeks: parsed.data.durationWeeks,
                currentGlobalAyah: offset,
                measurement: parsed.data.measurement,
                restDays: parsed.data.restDays,
            },
            planningDate,
            navigation,
            surahs,
        );

        await db.transaction(async (transaction) => {
            if (existing && !completedToday) {
                await transaction
                    .delete(userWirdHistory)
                    .where(
                        and(
                            eq(userWirdHistory.userId, session.user.id),
                            eq(userWirdHistory.targetDate, existing.targetDate),
                            eq(
                                userWirdHistory.targetStartGlobalAyah,
                                existing.targetStartGlobalAyah,
                            ),
                        ),
                    );
            }

            await transaction
                .insert(userKhatmahPlan)
                .values({
                    userId: session.user.id,
                    targetDate,
                    durationWeeks: parsed.data.durationWeeks,
                    repeatable: parsed.data.repeatable,
                    cycleStartedOn: planningDate,
                    cycleReadingDays: 0,
                    startGlobalAyah: offset,
                    currentGlobalAyah: offset,
                    measurement: parsed.data.measurement,
                    restDays: [...new Set(parsed.data.restDays)],
                    isActive: true,
                    completedAt: null,
                })
                .onConflictDoUpdate({
                    target: userKhatmahPlan.userId,
                    set: {
                        targetDate,
                        durationWeeks: parsed.data.durationWeeks,
                        repeatable: parsed.data.repeatable,
                        cycleStartedOn: planningDate,
                        cycleReadingDays: 0,
                        startGlobalAyah: offset,
                        currentGlobalAyah: offset,
                        measurement: parsed.data.measurement,
                        restDays: [...new Set(parsed.data.restDays)],
                        isActive: true,
                        completedAt: null,
                    },
                });

            await transaction
                .insert(userWird)
                .values({
                    userId: session.user.id,
                    unit: parsed.data.measurement,
                    amount: adaptive.amount,
                    targetStartGlobalAyah: adaptive.startGlobalAyah,
                    targetEndGlobalAyah: adaptive.endGlobalAyah,
                    progressGlobalAyah: null,
                    progressVerse: null,
                    nextGoal: null,
                    targetDate: adaptive.scheduledDate,
                    completedAt: null,
                })
                .onConflictDoUpdate({
                    target: userWird.userId,
                    set: {
                        unit: parsed.data.measurement,
                        amount: adaptive.amount,
                        targetStartGlobalAyah: adaptive.startGlobalAyah,
                        targetEndGlobalAyah: adaptive.endGlobalAyah,
                        progressGlobalAyah: null,
                        progressVerse: null,
                        nextGoal: null,
                        targetDate: adaptive.scheduledDate,
                        completedAt: null,
                    },
                });
        });
    } catch {
        return { success: false as const, message: "Could not save plan." };
    }

    revalidatePath("/wird");
    revalidatePath("/wird/read");
    revalidatePath("/dashboard");
    return { success: true as const };
}
