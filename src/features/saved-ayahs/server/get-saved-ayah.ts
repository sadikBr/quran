import "server-only";

import { and, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { savedAyah } from "@/drizzle/schema";

export default async function getSavedAyah(
    userId: string,
    globalAyahNumber: number,
) {
    const [result] = await db
        .select({
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

    return result ?? null;
}
