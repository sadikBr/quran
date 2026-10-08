"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import { recurringSettingsSchema } from "../recurrence";
import {
    changeRecurringPlan,
    recordRecurringOccurrence,
    saveRecurringPlan,
} from "./service";

async function owner() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session && !(await isPlatformAdmin(session.user.id))
        ? session.user.id
        : null;
}
function refresh() {
    for (const path of ["/plans", "/plans/today", "/weekly", "/dashboard"])
        revalidatePath(path);
}
const identity = z.object({
    id: z.string().uuid(),
    revision: z.number().int().positive(),
});
export async function savePersonalPlan(input: unknown) {
    const userId = await owner();
    const data = identity
        .extend({
            revision: z.number().int().positive().nullable(),
            settings: recurringSettingsSchema,
        })
        .safeParse(input);
    if (!userId || !data.success)
        return { success: false as const, reason: "invalid" as const };
    try {
        const result = await saveRecurringPlan(
            userId,
            data.data.id,
            data.data.revision,
            data.data.settings,
        );
        if (result.success) refresh();
        return result;
    } catch {
        return { success: false as const, reason: "failed" as const };
    }
}
export async function setPersonalPlanState(input: unknown) {
    const userId = await owner();
    const data = identity
        .extend({ action: z.enum(["pause", "resume", "archive"]) })
        .safeParse(input);
    if (!userId || !data.success)
        return { success: false as const, reason: "invalid" as const };
    try {
        const result = await changeRecurringPlan(
            userId,
            data.data.id,
            data.data.revision,
            data.data.action,
        );
        if (result.success) refresh();
        return result;
    } catch {
        return { success: false as const, reason: "failed" as const };
    }
}
export async function setPersonalOccurrence(input: unknown) {
    const userId = await owner();
    const data = identity
        .extend({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            status: z.enum(["pending", "completed", "skipped"]),
        })
        .safeParse(input);
    if (!userId || !data.success)
        return { success: false as const, reason: "invalid" as const };
    try {
        const result = await recordRecurringOccurrence(
            userId,
            data.data.id,
            data.data.revision,
            data.data.date,
            data.data.status,
        );
        if (result.success) refresh();
        return result;
    } catch {
        return { success: false as const, reason: "failed" as const };
    }
}
