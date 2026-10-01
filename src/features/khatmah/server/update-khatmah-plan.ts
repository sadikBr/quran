"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import {
    user,
    userKhatmahPlan,
    userWird,
    userWirdHistory,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getWirdDate from "@/features/wird/server/wird-date";
import { khatmahPlanSchema } from "../types";
import { buildAdaptiveKhatmahTarget, shiftDate } from "./calculate-khatmah";

export default async function updateKhatmahPlan(input: unknown) {
    const parsed = khatmahPlanSchema.safeParse(input);
    if (!parsed.success) return { success: false as const };
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };
    const data = parsed.data;
    try {
        const [surahs, navigation] = await Promise.all([
            getSurahsMeta(),
            getQuranNavigationMeta(),
        ]);
        const result = await db.transaction(async (tx) => {
            // Serialize creation too, when no plan/wird row exists yet.
            await tx
                .select({ id: user.id })
                .from(user)
                .where(eq(user.id, session.user.id))
                .for("update");
            // Same row order as daily completion: wird before plan.
            const [wird] = await tx
                .select()
                .from(userWird)
                .where(eq(userWird.userId, session.user.id))
                .for("update");
            const [plan] = await tx
                .select()
                .from(userKhatmahPlan)
                .where(eq(userKhatmahPlan.userId, session.user.id))
                .for("update");
            if (
                (data.mode === "create" && plan) ||
                (data.mode === "edit" && (!plan || plan.completedAt)) ||
                (data.mode === "restart" && (!plan || !data.confirmRestart))
            )
                return { success: false as const };
            const today = getWirdDate();
            // Restart replaces the current row, but completion history survives.
            // Use the actual completion day, not the portion's original due date.
            const [latestCompletion] = await tx
                .select({ completedAt: userWirdHistory.completedAt })
                .from(userWirdHistory)
                .where(eq(userWirdHistory.userId, session.user.id))
                .orderBy(desc(userWirdHistory.completedAt))
                .limit(1);
            const planningDate =
                (wird?.completedAt &&
                    getWirdDate(wird.completedAt) === today) ||
                (latestCompletion &&
                    getWirdDate(latestCompletion.completedAt) === today)
                    ? shiftDate(today, 1)
                    : today;
            if (data.mode === "edit" && plan) {
                const targetDate =
                    data.durationWeeks === plan.durationWeeks
                        ? plan.targetDate
                        : shiftDate(planningDate, data.durationWeeks * 7);
                await tx
                    .update(userKhatmahPlan)
                    .set({
                        durationWeeks: data.durationWeeks,
                        targetDate,
                        measurement: data.measurement,
                        repeatable: data.repeatable,
                        restDays: [],
                    })
                    .where(eq(userKhatmahPlan.userId, session.user.id));
                if (
                    plan.isActive &&
                    wird &&
                    !wird.completedAt &&
                    wird.targetDate > today &&
                    wird.progressGlobalAyah == null &&
                    wird.progressVerse == null
                ) {
                    const upcoming = buildAdaptiveKhatmahTarget(
                        {
                            targetDate,
                            durationWeeks: data.durationWeeks,
                            currentGlobalAyah: plan.currentGlobalAyah,
                            measurement: data.measurement,
                            restDays: [],
                        },
                        wird.targetDate,
                        navigation,
                        surahs,
                    );
                    await tx
                        .update(userWird)
                        .set({
                            unit: data.measurement,
                            amount: upcoming.amount,
                            targetStartGlobalAyah: upcoming.startGlobalAyah,
                            targetEndGlobalAyah: upcoming.endGlobalAyah,
                        })
                        .where(eq(userWird.userId, session.user.id));
                }
                // The next daily rollover uses these preferences. Do not replace
                // today's portion, completion, cursor, or pending reading goal.
                return { success: true as const };
            }
            let offset = 1;
            for (const surah of surahs) {
                if (surah.number === data.startSurah) break;
                offset += surah.numberOfAyahs;
            }
            const targetDate = shiftDate(planningDate, data.durationWeeks * 7);
            const adaptive = buildAdaptiveKhatmahTarget(
                {
                    targetDate,
                    durationWeeks: data.durationWeeks,
                    currentGlobalAyah: offset,
                    measurement: data.measurement,
                    restDays: [],
                },
                planningDate,
                navigation,
                surahs,
            );
            const values = {
                targetDate,
                durationWeeks: data.durationWeeks,
                repeatable: data.repeatable,
                cycleStartedOn: planningDate,
                cycleReadingDays: 0,
                startGlobalAyah: offset,
                currentGlobalAyah: offset,
                measurement: data.measurement,
                restDays: [],
                isActive: true,
                completedAt: null,
            };
            await tx
                .insert(userKhatmahPlan)
                .values({ userId: session.user.id, ...values })
                .onConflictDoUpdate({
                    target: userKhatmahPlan.userId,
                    set: values,
                });
            const portion = {
                unit: data.measurement,
                amount: adaptive.amount,
                targetStartGlobalAyah: adaptive.startGlobalAyah,
                targetEndGlobalAyah: adaptive.endGlobalAyah,
                progressGlobalAyah: null,
                progressVerse: null,
                nextGoal: null,
                targetDate: adaptive.scheduledDate,
                completedAt: null,
            };
            await tx
                .insert(userWird)
                .values({ userId: session.user.id, ...portion })
                .onConflictDoUpdate({ target: userWird.userId, set: portion });
            // Completed reading and khatma history are never deleted.
            return { success: true as const };
        });
        if (!result.success) return result;
    } catch {
        return { success: false as const };
    }
    for (const path of ["/", "/wird", "/wird/read", "/dashboard"])
        revalidatePath(path);
    return { success: true as const };
}
