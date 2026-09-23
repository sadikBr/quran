import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userReadingProgress } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import type { ReadingProgress } from "../types";

export default async function getReadingProgress(): Promise<ReadingProgress> {
    var session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return {
            lastPageNumber: null,
            lastSurahNumber: null,
        };
    }

    const [readingProgress] = await db
        .select()
        .from(userReadingProgress)
        .where(eq(userReadingProgress.userId, session.user.id))
        .limit(1);

    if (!readingProgress) {
        return {
            lastPageNumber: null,
            lastSurahNumber: null,
        };
    }

    return {
        lastPageNumber: readingProgress.lastPageNumber,
        lastSurahNumber: readingProgress.lastSurahNumber,
    };
}
