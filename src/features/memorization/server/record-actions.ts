"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import getPreferences from "@/features/settings/server/get-preferences";
import { confirmPersonalRange, saveBaseline } from "./record-service";

function refresh() {
    for (const path of [
        "/memorization",
        "/memorization/test",
        "/memorization/plan",
        "/memorization/revision",
        "/dashboard",
        "/practice",
        "/plans/today",
        "/weekly",
    ])
        revalidatePath(path);
}
export async function saveMemorizationBaseline(input: unknown) {
    const parsed = z
        .object({
            hizbs: z.array(z.number().int().min(1).max(60)).max(60),
            ranges: z
                .array(
                    z
                        .object({
                            surahNumber: z.number().int().min(1).max(114),
                            startAyahNumber: z.number().int().min(1).max(286),
                            endAyahNumber: z.number().int().min(1).max(286),
                        })
                        .refine((r) => r.endAyahNumber >= r.startAyahNumber),
                )
                .max(1000)
                .optional(),
            revision: z.number().int().nonnegative(),
            setup: z.boolean(),
            confirmed: z.literal(true),
        })
        .safeParse(input);
    const session = await auth.api.getSession({ headers: await headers() });
    if (!parsed.success || !session)
        return { success: false as const, reason: "invalid" as const };
    try {
        const preferences = await getPreferences();
        const result = await saveBaseline(
            session.user.id,
            parsed.data,
            preferences.riwayah,
        );
        refresh();
        if (result.success && result.changed) {
            revalidatePath("/practice/revision", "layout");
            revalidatePath("/practice/memorization", "layout");
        }
        return result;
    } catch {
        return { success: false as const, reason: "failed" as const };
    }
}
export async function confirmPersonalMemorization(input: unknown) {
    const parsed = z
        .object({
            assignmentId: z.string().min(1).max(100),
            riwayah: z.enum(["hafs", "warsh"]),
            startSurahNumber: z.number().int().min(1).max(114),
            startAyahNumber: z.number().int().min(1).max(286),
            endSurahNumber: z.number().int().min(1).max(114),
            endAyahNumber: z.number().int().min(1).max(286),
            confirmed: z.literal(true),
        })
        .safeParse(input);
    const session = await auth.api.getSession({ headers: await headers() });
    if (!parsed.success || !session) return { success: false };
    try {
        const result = await confirmPersonalRange(
            session.user.id,
            parsed.data.assignmentId,
            parsed.data,
        );
        refresh();
        revalidatePath(`/practice/${parsed.data.assignmentId}/read`);
        return result;
    } catch {
        return { success: false };
    }
}
