"use server";

import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userReadingProgress } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { readingProgressUpdateZodSchema } from "../types";

type UpdateReadingProgressResult =
    | { success: true }
    | { success: false; message: string };

export default async function updateReadingProgress(
    progress: unknown,
): Promise<UpdateReadingProgressResult> {
    const parsedProgress = readingProgressUpdateZodSchema.safeParse(progress);

    if (!parsedProgress.success) {
        return {
            success: false,
            message: "The reading position provided is invalid.",
        };
    }

    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return {
            success: false,
            message: "You must be signed in to save reading progress.",
        };
    }

    const positionToSave =
        parsedProgress.data.locationType === "page"
            ? { lastPageNumber: parsedProgress.data.number }
            : { lastSurahNumber: parsedProgress.data.number };

    try {
        await db
            .insert(userReadingProgress)
            .values({
                userId: session.user.id,
                ...positionToSave,
            })
            .onConflictDoUpdate({
                target: userReadingProgress.userId,
                set: {
                    ...positionToSave,
                },
            });

        return { success: true };
    } catch {
        return {
            success: false,
            message:
                "We could not save your reading progress. Please try again.",
        };
    }
}
