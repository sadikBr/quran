import "server-only";

import { count, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { bookmarkCollection, savedAyahCollection } from "@/drizzle/schema";
import type { BookmarkCollection } from "../types";

export default async function getBookmarkCollections(
    userId: string,
): Promise<BookmarkCollection[]> {
    return db
        .select({
            id: bookmarkCollection.id,
            name: bookmarkCollection.name,
            ayahCount: count(savedAyahCollection.collectionId),
        })
        .from(bookmarkCollection)
        .leftJoin(
            savedAyahCollection,
            eq(bookmarkCollection.id, savedAyahCollection.collectionId),
        )
        .where(eq(bookmarkCollection.userId, userId))
        .groupBy(bookmarkCollection.id, bookmarkCollection.name)
        .orderBy(bookmarkCollection.createdAt);
}
