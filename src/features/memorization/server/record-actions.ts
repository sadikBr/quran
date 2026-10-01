"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { getPlatformAdmin } from "@/features/auth/permissions";
import getPreferences from "@/features/settings/server/get-preferences";
import {
    confirmPersonalRange,
    requestCorrection,
    reviewCorrection,
    saveBaseline,
} from "./record-service";

function refresh() {
    for (const path of [
        "/memorization",
        "/memorization/test",
        "/dashboard",
        "/practice",
        "/admin",
        "/admin/memorization",
    ])
        revalidatePath(path);
}
export async function saveMemorizationBaseline(input: unknown) {
    const parsed = z
        .object({
            hizbs: z.array(z.number().int().min(1).max(60)).max(60),
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
        return result;
    } catch {
        return { success: false as const, reason: "failed" as const };
    }
}
export async function askMemorizationCorrection(input: unknown) {
    const parsed = z
        .object({ reason: z.string().trim().min(10).max(1000) })
        .safeParse(input);
    const session = await auth.api.getSession({ headers: await headers() });
    if (!parsed.success || !session) return { success: false };
    try {
        const result = await requestCorrection(
            session.user.id,
            parsed.data.reason,
        );
        refresh();
        return result;
    } catch {
        return { success: false };
    }
}
export async function reviewMemorizationCorrection(input: unknown) {
    const parsed = z
        .object({
            requestId: z.string().min(1).max(100),
            decision: z.enum(["approved", "declined"]),
            note: z.string().trim().max(1000).default(""),
        })
        .safeParse(input);
    const admin = await getPlatformAdmin();
    if (!parsed.success || !admin) return { success: false };
    try {
        const result = await reviewCorrection(
            admin.id,
            parsed.data.requestId,
            parsed.data.decision,
            parsed.data.note,
        );
        refresh();
        return result;
    } catch {
        return { success: false };
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
