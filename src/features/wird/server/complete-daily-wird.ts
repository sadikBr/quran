"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userKhatmahPlan, userWird, userWirdHistory } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { shiftDate } from "@/features/khatmah/server/calculate-khatmah";
import { TOTAL_QURAN_AYAHS } from "./build-wird-target";
import getWirdDate from "./wird-date";

export default async function completeDailyWird() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, message: "Sign in required." };
    }

    let completed = false;
    try {
        completed = await db.transaction(async (transaction) => {
            const [record] = await transaction
                .select()
                .from(userWird)
                .where(
                    and(
                        eq(userWird.userId, session.user.id),
                        isNull(userWird.completedAt),
                    ),
                )
                .limit(1);
            if (!record) return false;
            if (record.targetDate > getWirdDate()) return false;

            const completedAt = new Date();
            const updated = await transaction
                .update(userWird)
                .set({
                    completedAt,
                    progressGlobalAyah: record.targetEndGlobalAyah,
                })
                .where(
                    and(
                        eq(userWird.userId, session.user.id),
                        isNull(userWird.completedAt),
                    ),
                )
                .returning({ userId: userWird.userId });
            if (updated.length === 0) return false;

            await transaction
                .insert(userWirdHistory)
                .values({
                    id: randomUUID(),
                    userId: session.user.id,
                    unit: record.unit,
                    amount: record.amount,
                    targetStartGlobalAyah: record.targetStartGlobalAyah,
                    targetEndGlobalAyah: record.targetEndGlobalAyah,
                    targetDate: record.targetDate,
                    completedAt,
                })
                .onConflictDoUpdate({
                    target: [
                        userWirdHistory.userId,
                        userWirdHistory.targetDate,
                        userWirdHistory.targetStartGlobalAyah,
                    ],
                    set: {
                        unit: record.unit,
                        amount: record.amount,
                        targetEndGlobalAyah: record.targetEndGlobalAyah,
                        completedAt,
                    },
                });

            const [khatmahPlan] = await transaction
                .select()
                .from(userKhatmahPlan)
                .where(
                    and(
                        eq(userKhatmahPlan.userId, session.user.id),
                        eq(userKhatmahPlan.isActive, true),
                    ),
                )
                .limit(1);
            if (khatmahPlan) {
                const khatmahCompleted =
                    record.targetEndGlobalAyah >= TOTAL_QURAN_AYAHS;
                const startsNextCycle =
                    khatmahCompleted && khatmahPlan.repeatable;
                await transaction
                    .update(userKhatmahPlan)
                    .set({
                        startGlobalAyah: startsNextCycle
                            ? 1
                            : khatmahPlan.startGlobalAyah,
                        currentGlobalAyah: startsNextCycle
                            ? 1
                            : khatmahCompleted
                              ? TOTAL_QURAN_AYAHS + 1
                              : record.targetEndGlobalAyah + 1,
                        targetDate: startsNextCycle
                            ? shiftDate(
                                  getWirdDate(completedAt),
                                  khatmahPlan.durationWeeks * 7,
                              )
                            : khatmahPlan.targetDate,
                        isActive: startsNextCycle || !khatmahCompleted,
                        completedAt:
                            khatmahCompleted && !startsNextCycle
                                ? completedAt
                                : null,
                    })
                    .where(eq(userKhatmahPlan.userId, session.user.id));
            }
            return true;
        });
    } catch {
        return { success: false as const, message: "Could not complete Wird." };
    }

    if (!completed) {
        return { success: false as const, message: "No active Wird." };
    }

    revalidatePath("/wird");
    revalidatePath("/dashboard");
    return { success: true as const };
}
