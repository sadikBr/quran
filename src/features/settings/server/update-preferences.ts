"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userGuideProgress, userSettings } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getAvailableQuranEditions from "@/features/quran/server/get-quran-edition";
import { catalogSelectionChanged } from "../catalog-selection";
import { areEditionsCompatible } from "../edition-compatibility";
import { DEFAULT_PREFERENCES, preferencesZodSchema } from "../preferences";

type UpdatePreferencesResult =
    | { success: true }
    | { success: false; message: string };

export default async function updatePreferences(
    preferences: unknown,
): Promise<UpdatePreferencesResult> {
    const parsedPreferences = preferencesZodSchema.safeParse(preferences);

    if (!parsedPreferences.success) {
        return {
            success: false,
            message: "The preferences provided are invalid.",
        };
    }

    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return {
            success: false,
            message: "You must be signed in to update your settings.",
        };
    }

    const preferencesToSave = parsedPreferences.data;

    try {
        const [existing] = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, session.user.id))
            .limit(1);
        // Unchanged saved selections (or built-in defaults) do not need a remote catalog.
        if (
            catalogSelectionChanged(
                existing ?? DEFAULT_PREFERENCES,
                preferencesToSave,
            )
        ) {
            const [editions, { reciters }] = await Promise.all([
                getAvailableQuranEditions(),
                getAvailableReciters(),
            ]);

            if (!areEditionsCompatible(preferencesToSave, editions, reciters)) {
                return {
                    success: false,
                    message:
                        "One or more selected editions are not compatible with this reading mode.",
                };
            }
        }

        await db.transaction(async (transaction) => {
            await transaction
                .insert(userSettings)
                .values({
                    userId: session.user.id,
                    ...preferencesToSave,
                })
                .onConflictDoUpdate({
                    target: userSettings.userId,
                    set: {
                        ...preferencesToSave,
                    },
                });
            await transaction
                .insert(userGuideProgress)
                .values(
                    ["settings-complete", "welcome"].map((guideId) => ({
                        userId: session.user.id,
                        guideId,
                        completed: true,
                    })),
                )
                .onConflictDoUpdate({
                    target: [
                        userGuideProgress.userId,
                        userGuideProgress.guideId,
                    ],
                    set: { completed: true },
                });
        });

        // Preferences affect server-rendered data throughout the app (most
        // importantly the Quran reader). Clear the complete client router
        // cache so returning to an already visited URL cannot restore a Hafs
        // payload while the settings provider says Warsh, or vice versa.
        revalidatePath("/", "layout");

        return { success: true };
    } catch {
        return {
            success: false,
            message: "We could not save your settings. Please try again.",
        };
    }
}
