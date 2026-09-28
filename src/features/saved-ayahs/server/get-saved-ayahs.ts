import "server-only";

import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    bookmarkCollection,
    savedAyah,
    savedAyahCollection,
} from "@/drizzle/schema";
import type { SavedAyah } from "../types";

export default async function getSavedAyahs(
    userId: string,
): Promise<SavedAyah[]> {
    const [ayahs, memberships] = await Promise.all([
        db
            .select({
                globalAyahNumber: savedAyah.globalAyahNumber,
                surahNumber: savedAyah.surahNumber,
                ayahNumber: savedAyah.ayahNumber,
                pageNumber: savedAyah.pageNumber,
                surahName: savedAyah.surahName,
                arabicText: savedAyah.arabicText,
                isBookmarked: savedAyah.isBookmarked,
                reflection: savedAyah.reflection,
            })
            .from(savedAyah)
            .where(
                and(
                    eq(savedAyah.userId, userId),
                    or(
                        eq(savedAyah.isBookmarked, true),
                        isNotNull(savedAyah.reflection),
                    ),
                ),
            )
            .orderBy(desc(savedAyah.updatedAt)),
        db
            .select({
                globalAyahNumber: savedAyahCollection.globalAyahNumber,
                id: bookmarkCollection.id,
                name: bookmarkCollection.name,
            })
            .from(savedAyahCollection)
            .innerJoin(
                bookmarkCollection,
                eq(savedAyahCollection.collectionId, bookmarkCollection.id),
            )
            .where(eq(savedAyahCollection.userId, userId)),
    ]);

    const collectionsByAyah = new Map<
        number,
        { id: string; name: string; ayahCount: number }[]
    >();
    for (const membership of memberships) {
        const collections =
            collectionsByAyah.get(membership.globalAyahNumber) ?? [];
        collections.push({
            id: membership.id,
            name: membership.name,
            ayahCount: 0,
        });
        collectionsByAyah.set(membership.globalAyahNumber, collections);
    }

    return ayahs.map((ayah) => ({
        ...ayah,
        collections: collectionsByAyah.get(ayah.globalAyahNumber) ?? [],
    }));
}
