"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";
import getPreferences from "@/features/settings/server/get-preferences";
import { practiceRangeSchema, referenceOrder } from "../types";

export default async function savePracticeAssignment(input: unknown) {
    const parsed = practiceRangeSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, message: "Invalid practice range." };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, message: "Sign in required." };
    }

    const preferences = await getPreferences();
    const counts = new Map<number, number>();

    if (preferences.riwayah === "warsh") {
        const chapters = await getWarshChapters();
        for (const chapter of chapters) {
            counts.set(chapter.id, chapter.verses.length);
        }
    } else {
        const surahs = await getSurahsMeta();
        for (const surah of surahs) {
            counts.set(surah.number, surah.numberOfAyahs);
        }
    }

    const { kind, start, end } = parsed.data;
    const referencesExist =
        start.ayahNumber <= (counts.get(start.surahNumber) ?? 0) &&
        end.ayahNumber <= (counts.get(end.surahNumber) ?? 0);

    if (!referencesExist || referenceOrder(start) > referenceOrder(end)) {
        return { success: false as const, message: "Invalid practice range." };
    }

    const values = {
        kind,
        riwayah: preferences.riwayah,
        startSurahNumber: start.surahNumber,
        startAyahNumber: start.ayahNumber,
        endSurahNumber: end.surahNumber,
        endAyahNumber: end.ayahNumber,
        progressSurahNumber: null,
        progressAyahNumber: null,
        status: "in_progress",
        submittedAt: null,
        reviewedAt: null,
        reviewedById: null,
        reviewMethod: null,
        reviewNote: null,
        updatedAt: new Date(),
    };

    try {
        await db.transaction(async (transaction) => {
            const [existing] = await transaction
                .select({ id: practiceAssignment.id })
                .from(practiceAssignment)
                .where(
                    and(
                        eq(practiceAssignment.assigneeId, session.user.id),
                        eq(practiceAssignment.assignedById, session.user.id),
                        eq(practiceAssignment.kind, kind),
                        isNull(practiceAssignment.groupId),
                        inArray(practiceAssignment.status, [
                            "in_progress",
                            "submitted",
                            "needs_revision",
                        ]),
                    ),
                )
                .limit(1);

            if (existing) {
                await transaction
                    .update(practiceAssignment)
                    .set(values)
                    .where(eq(practiceAssignment.id, existing.id));
            } else {
                await transaction.insert(practiceAssignment).values({
                    id: crypto.randomUUID(),
                    assigneeId: session.user.id,
                    assignedById: session.user.id,
                    groupId: null,
                    ...values,
                });
            }
        });
    } catch {
        return { success: false as const, message: "Could not save range." };
    }

    revalidatePath("/practice");
    revalidatePath("/practice/read");
    revalidatePath("/dashboard");
    return { success: true as const };
}
