"use server";

import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userWird } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import mapWarshAyahs from "@/features/quran/helpers/map-warsh-ayahs";
import getSurahData from "@/features/quran/server/get-surah";
import getWarshChapter from "@/features/quran/server/get-warsh-chapter";
import getPreferences from "@/features/settings/server/get-preferences";
import { progressSaveSchema } from "../progress-save";

export default async function updateWirdProgress(input: unknown) {
    const parsed = progressSaveSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, message: "Invalid ayah." };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, message: "Sign in required." };
    }

    let revision = "";
    try {
        const preferences = await getPreferences();
        if (preferences.riwayah !== parsed.data.riwayah)
            return { success: false as const, message: "conflict" };
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
                updatedAt: sql`greatest(clock_timestamp(), ${userWird.updatedAt} + interval '1 microsecond')`,
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
                    sql`${userWird.updatedAt} = ${parsed.data.expectedRevision}::timestamptz`,
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
            .returning({ revision: sql<string>`${userWird.updatedAt}::text` });

        if (updated.length === 0) {
            return { success: false as const, message: "conflict" };
        }
        revision = updated[0].revision;
    } catch {
        return { success: false as const, message: "Could not save progress." };
    }

    revalidatePath("/wird");
    revalidatePath("/wird/read");
    revalidatePath("/dashboard");
    revalidatePath("/plans");
    revalidatePath("/plans/today");
    return { success: true as const, revision };
}
