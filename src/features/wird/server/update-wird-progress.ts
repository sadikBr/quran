"use server";

import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { userWird } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const inputSchema = z.object({
    globalAyahNumber: z.number().int().min(1).max(6236),
});

export default async function updateWirdProgress(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, message: "Invalid ayah." };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, message: "Sign in required." };
    }

    try {
        const updated = await db
            .update(userWird)
            .set({ progressGlobalAyah: parsed.data.globalAyahNumber })
            .where(
                and(
                    eq(userWird.userId, session.user.id),
                    isNull(userWird.completedAt),
                    lte(
                        userWird.targetStartGlobalAyah,
                        parsed.data.globalAyahNumber,
                    ),
                    gte(
                        userWird.targetEndGlobalAyah,
                        parsed.data.globalAyahNumber,
                    ),
                ),
            )
            .returning({ userId: userWird.userId });

        if (updated.length === 0) {
            return { success: false as const, message: "No active Wird." };
        }
    } catch {
        return { success: false as const, message: "Could not save progress." };
    }

    revalidatePath("/wird");
    revalidatePath("/wird/read");
    revalidatePath("/dashboard");
    return { success: true as const };
}
