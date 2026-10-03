"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { user, userKhatmahPlan, userWird } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

export default async function cancelKhatmahPlan(confirmed: boolean) {
    if (confirmed !== true) return { success: false as const };
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };
    try {
        await db.transaction(async (tx) => {
            await tx
                .select({ id: user.id })
                .from(user)
                .where(eq(user.id, session.user.id))
                .for("update");
            // Same lock order as editing/completion; preserve reading and history.
            await tx
                .select({ userId: userWird.userId })
                .from(userWird)
                .where(eq(userWird.userId, session.user.id))
                .for("update");
            await tx
                .delete(userKhatmahPlan)
                .where(eq(userKhatmahPlan.userId, session.user.id));
        });
    } catch {
        return { success: false as const };
    }
    for (const path of ["/", "/wird", "/wird/read", "/dashboard", "/weekly"])
        revalidatePath(path);
    return { success: true as const };
}
