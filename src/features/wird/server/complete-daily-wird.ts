"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userWird } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

export default async function completeDailyWird() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, message: "Sign in required." };
    }

    let completed: { userId: string }[];
    try {
        completed = await db
            .update(userWird)
            .set({
                completedAt: new Date(),
                progressGlobalAyah: userWird.targetEndGlobalAyah,
            })
            .where(
                and(
                    eq(userWird.userId, session.user.id),
                    isNull(userWird.completedAt),
                ),
            )
            .returning({ userId: userWird.userId });
    } catch {
        return { success: false as const, message: "Could not complete Wird." };
    }

    if (completed.length === 0) {
        return { success: false as const, message: "No active Wird." };
    }

    revalidatePath("/wird");
    revalidatePath("/dashboard");
    return { success: true as const };
}
