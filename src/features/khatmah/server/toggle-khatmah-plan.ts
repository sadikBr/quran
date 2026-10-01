"use server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userKhatmahPlan } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

export default async function toggleKhatmahPlan(isActive: boolean) {
    if (typeof isActive !== "boolean") return { success: false as const };
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };
    try {
        const updated = await db
            .update(userKhatmahPlan)
            .set({ isActive })
            .where(
                and(
                    eq(userKhatmahPlan.userId, session.user.id),
                    isNull(userKhatmahPlan.completedAt),
                ),
            )
            .returning({ userId: userKhatmahPlan.userId });
        if (!updated.length) return { success: false as const };
    } catch {
        return { success: false as const };
    }
    for (const path of ["/", "/wird", "/wird/read", "/dashboard"])
        revalidatePath(path);
    return { success: true as const };
}
