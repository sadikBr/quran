"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userKhatmahPlan, userWird } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getWirdDate from "@/features/wird/server/wird-date";
import type { KhatmahMeasurement } from "../types";
import { buildAdaptiveKhatmahTarget, shiftDate } from "./calculate-khatmah";

export default async function toggleKhatmahPlan(isActive: boolean) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };

    try {
        if (isActive) {
            const [plans, wirdRecords, navigation, surahs] = await Promise.all([
                db
                    .select()
                    .from(userKhatmahPlan)
                    .where(eq(userKhatmahPlan.userId, session.user.id))
                    .limit(1),
                db
                    .select()
                    .from(userWird)
                    .where(eq(userWird.userId, session.user.id))
                    .limit(1),
                getQuranNavigationMeta(),
                getSurahsMeta(),
            ]);
            const plan = plans[0];
            if (!plan || plan.completedAt) return { success: false as const };
            const currentDate = getWirdDate();
            const completedToday =
                wirdRecords[0]?.completedAt &&
                getWirdDate(wirdRecords[0].completedAt) === currentDate;
            const adaptive = buildAdaptiveKhatmahTarget(
                {
                    targetDate: plan.targetDate,
                    durationWeeks: plan.durationWeeks,
                    currentGlobalAyah: plan.currentGlobalAyah,
                    measurement: plan.measurement as KhatmahMeasurement,
                    restDays: plan.restDays,
                },
                completedToday ? shiftDate(currentDate, 1) : currentDate,
                navigation,
                surahs,
            );

            await db.transaction(async (transaction) => {
                await transaction
                    .update(userKhatmahPlan)
                    .set({
                        isActive: true,
                        targetDate: adaptive.targetDate,
                    })
                    .where(eq(userKhatmahPlan.userId, session.user.id));
                await transaction
                    .insert(userWird)
                    .values({
                        userId: session.user.id,
                        unit: plan.measurement,
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
                            unit: plan.measurement,
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
        } else {
            await db
                .update(userKhatmahPlan)
                .set({ isActive: false })
                .where(eq(userKhatmahPlan.userId, session.user.id));
        }
    } catch {
        return { success: false as const };
    }

    revalidatePath("/wird");
    revalidatePath("/dashboard");
    return { success: true as const };
}
