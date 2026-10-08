"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import { quranReferenceSchema } from "@/features/practice/types";
import { revisionSettingsSchema } from "../schedule";
import {
    deleteRevisionPlan,
    pauseRevisionPlan,
    previewRevisionPlan,
    saveRevisionPlan,
    updateRevisionSession,
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
        "/memorization/revision",
        "/dashboard",
        "/plans",
        "/plans/today",
        "/practice",
    ])
        revalidatePath(path);
}
export async function previewWeeklyRevision(
    input: unknown,
    regenerate: unknown = false,
) {
    const data = revisionSettingsSchema.safeParse(input),
        userId = await owner();
    if (!data.success || !userId || typeof regenerate !== "boolean")
        return { success: false as const };
    try {
        return {
            success: true as const,
            preview: await previewRevisionPlan(userId, data.data, regenerate),
        };
    } catch {
        return { success: false as const };
    }
}
export async function saveWeeklyRevision(input: unknown) {
    const data = z
            .object({
                settings: revisionSettingsSchema,
                key: z.string().length(64),
                regenerate: z.boolean().default(false),
                confirmed: z.literal(true),
            })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId)
        return { success: false as const, reason: "invalid" };
    try {
        const result = await saveRevisionPlan(
            userId,
            data.data.settings,
            data.data.key,
            data.data.regenerate,
        );
        refresh();
        if (data.data.regenerate)
            revalidatePath("/practice/revision", "layout");
        return result;
    } catch {
        return { success: false as const, reason: "failed" };
    }
}
export async function deleteWeeklyRevision(input: unknown) {
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
        const result = await deleteRevisionPlan(userId, data.data.version);
        refresh();
        revalidatePath("/practice/revision", "layout");
        return result;
    } catch {
        return { success: false as const, reason: "failed" };
    }
}
export async function pauseWeeklyRevision(input: unknown) {
    const data = z
            .object({ revision: z.number().int().positive() })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId) return { success: false };
    try {
        const result = await pauseRevisionPlan(userId, data.data.revision);
        refresh();
        return result;
    } catch {
        return { success: false };
    }
}
export async function saveWeeklyRevisionProgress(input: unknown) {
    const data = quranReferenceSchema
            .extend({ assignmentId: z.string().min(1).max(100) })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId) return { success: false as const };
    try {
        return await updateRevisionSession(
            userId,
            data.data.assignmentId,
            data.data,
        );
    } catch {
        return { success: false as const };
    }
}
export async function finishWeeklyRevision(input: unknown) {
    const data = z
            .object({
                sessionId: z.string().min(1).max(100),
                outcome: z.enum(["comfortable", "difficult"]),
                confirmed: z.literal(true),
            })
            .safeParse(input),
        userId = await owner();
    if (!data.success || !userId) return { success: false as const };
    try {
        const result = await updateRevisionSession(
            userId,
            data.data.sessionId,
            { outcome: data.data.outcome },
        );
        refresh();
        revalidatePath(`/practice/revision/${data.data.sessionId}/read`);
        return result;
    } catch {
        return { success: false as const };
    }
}
