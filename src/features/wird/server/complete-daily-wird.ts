"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import {
    userKhatmahHistory,
    userKhatmahPlan,
    userWird,
    userWirdHistory,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import {
    countCalendarDays,
    shiftDate,
} from "@/features/khatmah/server/calculate-khatmah";
import { wirdCompletionSchema } from "../completion";
import { TOTAL_QURAN_AYAHS } from "./build-wird-target";
import getWirdDate from "./wird-date";

export default async function completeDailyWird(input: unknown) {
    const parsed = wirdCompletionSchema.safeParse(input);
    if (!parsed.success)
        return { success: false as const, message: "Invalid portion." };
    const expected = parsed.data;
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
                        eq(userWird.targetDate, expected.targetDate),
                        eq(userWird.targetStartGlobalAyah, expected.start),
                        eq(userWird.targetEndGlobalAyah, expected.end),
                        sql`${userWird.updatedAt} = ${expected.revision}::timestamptz`,
                    ),
                )
                .limit(1)
                .for("update");
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
                const completionDate = getWirdDate(completedAt);
                if (khatmahCompleted) {
                    await transaction.insert(userKhatmahHistory).values({
                        id: randomUUID(),
                        userId: session.user.id,
                        startedOn: khatmahPlan.cycleStartedOn,
                        completedAt,
                        plannedWeeks: khatmahPlan.durationWeeks,
                        actualDays: Math.max(
                            1,
                            countCalendarDays(
                                khatmahPlan.cycleStartedOn,
                                completionDate,
                            ),
                        ),
                        readingDays: khatmahPlan.cycleReadingDays + 1,
                        measurement: khatmahPlan.measurement,
                        startedGlobalAyah: khatmahPlan.startGlobalAyah,
                        wasRepeatable: khatmahPlan.repeatable,
                    });
                }
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
                                  completionDate,
                                  khatmahPlan.durationWeeks * 7,
                              )
                            : khatmahPlan.targetDate,
                        cycleStartedOn: startsNextCycle
                            ? shiftDate(completionDate, 1)
                            : khatmahPlan.cycleStartedOn,
                        cycleReadingDays: startsNextCycle
                            ? 0
                            : khatmahPlan.cycleReadingDays + 1,
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
        return {
            success: false as const,
            conflict: true,
            message: "This portion has changed. Reload it before completing.",
        };
    }

    revalidatePath("/wird");
    revalidatePath("/wird/read");
    revalidatePath("/dashboard");
    return { success: true as const };
}
