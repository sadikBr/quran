"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userKhatmahPlan, userWird } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { wirdPreferenceSchema } from "../types";
import buildWirdTarget from "./build-wird-target";
import getWirdDate from "./wird-date";

const MAX_AMOUNTS = {
    ayah: 100,
    page: 50,
    quarter: 8,
    hizb: 4,
    juz: 3,
    surah: 5,
} as const;

export default async function updateWirdPreference(input: unknown) {
    const parsed = wirdPreferenceSchema.safeParse(input);
    if (!parsed.success || parsed.data.amount > MAX_AMOUNTS[parsed.data.unit]) {
        return { success: false as const, message: "Invalid Wird goal." };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, message: "Sign in required." };
    }

    try {
        const [existingRecords, navigation, surahs] = await Promise.all([
            db
                .select()
                .from(userWird)
                .where(eq(userWird.userId, session.user.id))
                .limit(1),
            getQuranNavigationMeta(),
            getSurahsMeta(),
        ]);
        const existing = existingRecords[0];
        const target = buildWirdTarget(
            parsed.data.unit,
            parsed.data.amount,
            existing?.targetStartGlobalAyah ?? 1,
            navigation,
            surahs,
        );
        const targetDate = getWirdDate();

        const saved = await db.transaction(async (transaction) => {
            const [plan] = await transaction
                .select()
                .from(userKhatmahPlan)
                .where(
                    and(
                        eq(userKhatmahPlan.userId, session.user.id),
                        eq(userKhatmahPlan.isActive, true),
                    ),
                )
                .for("update");
            if (plan) return false;

            await transaction
                .insert(userWird)
                .values({
                    userId: session.user.id,
                    unit: parsed.data.unit,
                    amount: parsed.data.amount,
                    targetStartGlobalAyah: target.startGlobalAyah,
                    targetEndGlobalAyah: target.endGlobalAyah,
                    progressGlobalAyah: null,
                    targetDate,
                    completedAt: null,
                })
                .onConflictDoUpdate({
                    target: userWird.userId,
                    set: {
                        nextGoal: parsed.data,
                    },
                });
            return true;
        });
        if (!saved) return { success: false as const, message: "planManaged" };
    } catch {
        return { success: false as const, message: "Could not save Wird." };
    }

    revalidatePath("/wird");
    revalidatePath("/wird/read");
    revalidatePath("/dashboard");
    return { success: true as const };
}
