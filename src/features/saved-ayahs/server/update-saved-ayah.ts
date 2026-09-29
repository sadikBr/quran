"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { savedAyah, savedAyahCollection } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { bookmarkUpdateSchema, reflectionUpdateSchema } from "../types";

type SavedAyahUpdateResult =
    | { success: true }
    | { success: false; message: string };

async function getUserId() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user.id ?? null;
}

export async function updateBookmark(
    input: unknown,
): Promise<SavedAyahUpdateResult> {
    const parsedInput = bookmarkUpdateSchema.safeParse(input);

    if (!parsedInput.success) {
        return { success: false, message: "The bookmark details are invalid." };
    }

    const userId = await getUserId();

    if (!userId) {
        return { success: false, message: "Sign in to save bookmarks." };
    }

    const { isBookmarked, ...metadata } = parsedInput.data;

    try {
        await db.transaction(async (transaction) => {
            await transaction
                .insert(savedAyah)
                .values({ userId, ...metadata, isBookmarked })
                .onConflictDoUpdate({
                    target: [savedAyah.userId, savedAyah.globalAyahNumber],
                    set: {
                        ...metadata,
                        isBookmarked,
                        updatedAt: new Date(),
                    },
                });

            if (!isBookmarked) {
                await transaction
                    .delete(savedAyahCollection)
                    .where(
                        and(
                            eq(savedAyahCollection.userId, userId),
                            eq(
                                savedAyahCollection.globalAyahNumber,
                                metadata.globalAyahNumber,
                            ),
                        ),
                    );
                await transaction
                    .delete(savedAyah)
                    .where(
                        and(
                            eq(savedAyah.userId, userId),
                            eq(
                                savedAyah.globalAyahNumber,
                                metadata.globalAyahNumber,
                            ),
                            eq(savedAyah.isBookmarked, false),
                            isNull(savedAyah.reflection),
                        ),
                    );
            }
        });

        revalidatePath("/bookmarks");
        return { success: true };
    } catch {
        return {
            success: false,
            message: "We could not update this bookmark. Please try again.",
        };
    }
}

export async function updateReflection(
    input: unknown,
): Promise<SavedAyahUpdateResult> {
    const parsedInput = reflectionUpdateSchema.safeParse(input);

    if (!parsedInput.success) {
        return { success: false, message: "The reflection is invalid." };
    }

    const userId = await getUserId();

    if (!userId) {
        return { success: false, message: "Sign in to save reflections." };
    }

    const { reflection, ...metadata } = parsedInput.data;
    const savedReflection = reflection || null;

    try {
        await db.transaction(async (transaction) => {
            await transaction
                .insert(savedAyah)
                .values({
                    userId,
                    ...metadata,
                    reflection: savedReflection,
                })
                .onConflictDoUpdate({
                    target: [savedAyah.userId, savedAyah.globalAyahNumber],
                    set: {
                        ...metadata,
                        reflection: savedReflection,
                        updatedAt: new Date(),
                    },
                });

            if (!savedReflection) {
                await transaction
                    .delete(savedAyah)
                    .where(
                        and(
                            eq(savedAyah.userId, userId),
                            eq(
                                savedAyah.globalAyahNumber,
                                metadata.globalAyahNumber,
                            ),
                            eq(savedAyah.isBookmarked, false),
                            isNull(savedAyah.reflection),
                        ),
                    );
            }
        });

        revalidatePath("/bookmarks");
        return { success: true };
    } catch {
        return {
            success: false,
            message: "We could not save this reflection. Please try again.",
        };
    }
}
