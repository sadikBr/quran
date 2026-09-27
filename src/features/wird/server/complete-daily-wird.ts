"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userWird, userWirdHistory } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

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
