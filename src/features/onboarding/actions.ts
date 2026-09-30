"use server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userGuideProgress } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { isGuideId } from "./guides";

export async function getGuideProgress() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;
    return db
        .select()
        .from(userGuideProgress)
        .where(eq(userGuideProgress.userId, session.user.id));
}
export async function saveGuideProgress(guideId: string, completed: boolean) {
    if (
        (guideId !== "welcome" &&
            guideId !== "settings-complete" &&
            !isGuideId(guideId)) ||
        typeof completed !== "boolean"
    )
        return { success: false };
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false };
    await db
        .insert(userGuideProgress)
        .values(
            (guideId === "settings-complete"
                ? ["settings-complete", "welcome"]
                : [guideId]
            ).map((id) => ({
                userId: session.user.id,
                guideId: id,
                completed,
            })),
        )
        .onConflictDoUpdate({
            target: [userGuideProgress.userId, userGuideProgress.guideId],
            set: { completed },
        });
    return { success: true };
}
