"use server";

import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userSettings } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getAvailableQuranEditions from "@/features/quran/server/get-quran-edition";
import { areEditionsCompatible } from "../edition-compatibility";
import { preferencesZodSchema } from "../preferences";

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

        await db
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

        return { success: true };
    } catch {
        return {
            success: false,
            message: "We could not save your settings. Please try again.",
        };
    }
}
