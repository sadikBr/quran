"use server";

import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { userWird } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import mapWarshAyahs from "@/features/quran/helpers/map-warsh-ayahs";
import getSurahData from "@/features/quran/server/get-surah";
import getWarshChapter from "@/features/quran/server/get-warsh-chapter";
import getPreferences from "@/features/settings/server/get-preferences";

const inputSchema = z.object({
    globalAyahNumber: z.number().int().min(1).max(6236),
    start: z.number().int().min(1).max(6236),
    end: z.number().int().min(1).max(6236),
    surahNumber: z.number().int().min(1).max(114),
    ayahNumber: z.number().int().min(1).max(286),
});

export default async function updateWirdProgress(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, message: "Invalid ayah." };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, message: "Sign in required." };
    }

    try {
        const preferences = await getPreferences();
        const surah = await getSurahData(
            String(parsed.data.surahNumber),
            preferences.arabicEdition,
        );
        const ayahs =
            preferences.riwayah === "warsh"
                ? mapWarshAyahs(
                      surah.ayahs,
                      await getWarshChapter(parsed.data.surahNumber),
                  )
                : surah.ayahs;
        const verse = ayahs.find(
            (ayah) =>
                !ayah.isBasmalaSentinel &&
                ayah.numberInSurah === parsed.data.ayahNumber,
        );
        if (!verse)
            return { success: false as const, message: "Invalid verse." };
        const anchors = verse.hafsGlobalNumbers ?? [verse.number];
        const inRange = anchors.filter(
            (n) => n >= parsed.data.start && n <= parsed.data.end,
        );
        if (
            !inRange.length ||
            Math.max(...inRange) !== parsed.data.globalAyahNumber
        )
            return { success: false as const, message: "Invalid progress." };
        const updated = await db
            .update(userWird)
            .set({
                progressGlobalAyah: parsed.data.globalAyahNumber,
                progressVerse: {
                    riwayah: preferences.riwayah,
                    surahNumber: parsed.data.surahNumber,
                    ayahNumber: parsed.data.ayahNumber,
                },
            })
            .where(
                and(
                    eq(userWird.userId, session.user.id),
                    isNull(userWird.completedAt),
                    eq(userWird.targetStartGlobalAyah, parsed.data.start),
                    eq(userWird.targetEndGlobalAyah, parsed.data.end),
                    lte(
                        userWird.targetStartGlobalAyah,
                        parsed.data.globalAyahNumber,
                    ),
                    gte(
                        userWird.targetEndGlobalAyah,
                        parsed.data.globalAyahNumber,
                    ),
                ),
            )
            .returning({ userId: userWird.userId });

        if (updated.length === 0) {
            return { success: false as const, message: "No active Wird." };
        }
    } catch {
        return { success: false as const, message: "Could not save progress." };
    }

    revalidatePath("/wird");
    revalidatePath("/wird/read");
    revalidatePath("/dashboard");
    return { success: true as const };
}
