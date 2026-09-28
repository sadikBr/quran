"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import z from "zod";
import db from "@/drizzle/db";
import {
    bookmarkCollection,
    savedAyah,
    savedAyahCollection,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { bookmarkCollectionNameSchema } from "../types";

type CollectionResult =
    | { success: true; collection?: { id: string; name: string } }
    | { success: false; message: string };

const collectionIdSchema = z.string().trim().min(1).max(100);
const createCollectionSchema = z.object({
    name: bookmarkCollectionNameSchema,
    globalAyahNumber: z.number().int().min(1).max(6236).optional(),
});
const updateCollectionsSchema = z.object({
    globalAyahNumber: z.number().int().min(1).max(6236),
    collectionIds: z.array(collectionIdSchema).max(50),
});

async function getUserId() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user.id ?? null;
}

function collectionNameKey(name: string) {
    return name.normalize("NFKC").toLocaleLowerCase();
}

export async function createBookmarkCollection(
    input: unknown,
): Promise<CollectionResult> {
    const parsed = createCollectionSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: "The collection name is invalid." };
    }
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Sign in to continue." };

    const { name, globalAyahNumber } = parsed.data;
    const nameKey = collectionNameKey(name);

    try {
        const collection = await db.transaction(async (transaction) => {
            await transaction
                .insert(bookmarkCollection)
                .values({ id: randomUUID(), userId, name, nameKey })
                .onConflictDoNothing({
                    target: [
                        bookmarkCollection.userId,
                        bookmarkCollection.nameKey,
                    ],
                });

            const [savedCollection] = await transaction
                .select({
                    id: bookmarkCollection.id,
                    name: bookmarkCollection.name,
                })
                .from(bookmarkCollection)
                .where(
                    and(
                        eq(bookmarkCollection.userId, userId),
                        eq(bookmarkCollection.nameKey, nameKey),
                    ),
                )
                .limit(1);

            if (!savedCollection) throw new Error("Collection was not saved.");

            if (globalAyahNumber) {
                const [bookmark] = await transaction
                    .select({ globalAyahNumber: savedAyah.globalAyahNumber })
                    .from(savedAyah)
                    .where(
                        and(
                            eq(savedAyah.userId, userId),
                            eq(savedAyah.globalAyahNumber, globalAyahNumber),
                            eq(savedAyah.isBookmarked, true),
                        ),
                    )
                    .limit(1);

                if (bookmark) {
                    await transaction
                        .insert(savedAyahCollection)
                        .values({
                            userId,
                            globalAyahNumber,
                            collectionId: savedCollection.id,
                        })
                        .onConflictDoNothing();
                }
            }

            return savedCollection;
        });

        revalidatePath("/dashboard");
        return { success: true, collection };
    } catch {
        return {
            success: false,
            message: "The collection could not be saved.",
        };
    }
}

export async function updateBookmarkCollections(
    input: unknown,
): Promise<CollectionResult> {
    const parsed = updateCollectionsSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            message: "The selected collections are invalid.",
        };
    }
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Sign in to continue." };

    const collectionIds = [...new Set(parsed.data.collectionIds)];

    try {
        await db.transaction(async (transaction) => {
            const ownedCollections = collectionIds.length
                ? await transaction
                      .select({ id: bookmarkCollection.id })
                      .from(bookmarkCollection)
                      .where(
                          and(
                              eq(bookmarkCollection.userId, userId),
                              inArray(bookmarkCollection.id, collectionIds),
                          ),
                      )
                : [];

            if (ownedCollections.length !== collectionIds.length) {
                throw new Error("Unknown collection.");
            }

            const [bookmark] = await transaction
                .select({ globalAyahNumber: savedAyah.globalAyahNumber })
                .from(savedAyah)
                .where(
                    and(
                        eq(savedAyah.userId, userId),
                        eq(
                            savedAyah.globalAyahNumber,
                            parsed.data.globalAyahNumber,
                        ),
                        eq(savedAyah.isBookmarked, true),
                    ),
                )
                .limit(1);
            if (!bookmark) throw new Error("Bookmark was not found.");

            await transaction
                .delete(savedAyahCollection)
                .where(
                    and(
                        eq(savedAyahCollection.userId, userId),
                        eq(
                            savedAyahCollection.globalAyahNumber,
                            parsed.data.globalAyahNumber,
                        ),
                    ),
                );

            if (collectionIds.length) {
                await transaction.insert(savedAyahCollection).values(
                    collectionIds.map((collectionId) => ({
                        userId,
                        globalAyahNumber: parsed.data.globalAyahNumber,
                        collectionId,
                    })),
                );
            }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch {
        return {
            success: false,
            message: "The collections could not be updated.",
        };
    }
}

export async function deleteBookmarkCollection(
    input: unknown,
): Promise<CollectionResult> {
    const parsed = collectionIdSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, message: "The collection is invalid." };
    }
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Sign in to continue." };

    try {
        await db
            .delete(bookmarkCollection)
            .where(
                and(
                    eq(bookmarkCollection.id, parsed.data),
                    eq(bookmarkCollection.userId, userId),
                ),
            );
        revalidatePath("/dashboard");
        return { success: true };
    } catch {
        return {
            success: false,
            message: "The collection could not be deleted.",
        };
    }
}
