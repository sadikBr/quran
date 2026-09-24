import "server-only";

import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import db from "@/drizzle/db";
import { savedAyah } from "@/drizzle/schema";
import type { SavedAyah } from "../types";

export default async function getSavedAyahs(
    userId: string,
): Promise<SavedAyah[]> {
    return db
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
        .orderBy(desc(savedAyah.updatedAt));
}
