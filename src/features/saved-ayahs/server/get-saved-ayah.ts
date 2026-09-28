import "server-only";

import { and, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { savedAyah, savedAyahCollection } from "@/drizzle/schema";

export default async function getSavedAyah(
    userId: string,
    globalAyahNumber: number,
) {
    const [result] = await db
        .select({
            ayahNumber: savedAyah.ayahNumber,
            isBookmarked: savedAyah.isBookmarked,
            reflection: savedAyah.reflection,
        })
        .from(savedAyah)
        .where(
            and(
                eq(savedAyah.userId, userId),
                eq(savedAyah.globalAyahNumber, globalAyahNumber),
            ),
        )
        .limit(1);

    if (!result) return null;

    const memberships = await db
        .select({ collectionId: savedAyahCollection.collectionId })
        .from(savedAyahCollection)
        .where(
            and(
                eq(savedAyahCollection.userId, userId),
                eq(savedAyahCollection.globalAyahNumber, globalAyahNumber),
            ),
        );

    return {
        ...result,
        collectionIds: memberships.map((item) => item.collectionId),
    };
}
