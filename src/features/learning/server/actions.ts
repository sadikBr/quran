"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import { quranReferenceSchema } from "@/features/practice/types";
import {
    learningScheduleSchema,
    memorizationSettingsSchema,
} from "../schedule";
import {
    deleteMemorizationPlan,
    finishMemorizationSession,
    pauseMemorizationPlan,
    previewMemorizationPlan,
    saveLearningSchedule,
    saveMemorizationPlan,
    saveMemorizationProgress,
} from "./service";

async function owner() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session && !(await isPlatformAdmin(session.user.id))
        ? session.user.id
        : null;
}
function refresh() {
    for (const path of [
        "/memorization",
        "/memorization/plan",
        "/memorization/revision",
        "/dashboard",
        "/practice",
        "/settings",
    ])
        revalidatePath(path);
}
export async function saveStudyDays(input: unknown) {
    const data = learningScheduleSchema.safeParse(input),
        userId = await owner();
    if (!data.success || !userId)
        return { success: false as const, reason: "invalid" };
    try {
        const result = await saveLearningSchedule(userId, data.data);
        refresh();
        return result;
    } catch {
        return { success: false as const, reason: "failed" };
    }
}
export async function previewWeeklyMemorization(
    input: unknown,
    regenerate: unknown = false,
) {
    const data = memorizationSettingsSchema.safeParse(input),
        userId = await owner();
    if (!data.success || !userId || typeof regenerate !== "boolean")
        return { success: false as const };
    try {
        return {
            success: true as const,
            preview: await previewMemorizationPlan(
                userId,
                data.data,
                regenerate,
            ),
        };
    } catch {
        return { success: false as const };
    }
}
export async function saveWeeklyMemorization(input: unknown) {
    const data = z
            .object({
                settings: memorizationSettingsSchema,
                key: z.string().length(64),
                regenerate: z.boolean().default(false),
                confirmed: z.literal(true),
            })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId)
        return { success: false as const, reason: "invalid" };
    try {
        const result = await saveMemorizationPlan(
            userId,
            data.data.settings,
            data.data.key,
            data.data.regenerate,
        );
        refresh();
        if (data.data.regenerate)
            revalidatePath("/practice/memorization", "layout");
        return result;
    } catch {
        return { success: false as const, reason: "failed" };
    }
}
export async function deleteWeeklyMemorization(input: unknown) {
    const data = z
            .object({
                version: z.string().length(64),
                confirmed: z.literal(true),
            })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId)
        return { success: false as const, reason: "invalid" };
    try {
        const result = await deleteMemorizationPlan(userId, data.data.version);
        refresh();
        revalidatePath("/practice/memorization", "layout");
        return result;
    } catch {
        return { success: false as const, reason: "failed" };
    }
}
export async function pauseWeeklyMemorization(input: unknown) {
    const data = z
            .object({ revision: z.number().int().positive() })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId) return { success: false };
    try {
        const result = await pauseMemorizationPlan(userId, data.data.revision);
        refresh();
        return result;
    } catch {
        return { success: false };
    }
}
export async function saveWeeklyMemorizationProgress(input: unknown) {
    const data = quranReferenceSchema
            .extend({ assignmentId: z.string().min(1).max(100) })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId) return { success: false as const };
    try {
        return await saveMemorizationProgress(
            userId,
            data.data.assignmentId,
            data.data,
        );
    } catch {
        return { success: false as const };
    }
}
export async function completeWeeklyMemorization(input: unknown) {
    const data = z
            .object({
                sessionId: z.string().min(1).max(100),
                confirmed: z.literal(true),
            })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId) return { success: false };
    try {
        const result = await finishMemorizationSession(
            userId,
            data.data.sessionId,
        );
        refresh();
        revalidatePath(`/practice/memorization/${data.data.sessionId}/read`);
        return result;
    } catch {
        return { success: false };
    }
}
