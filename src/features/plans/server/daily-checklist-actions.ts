"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import {
    adhkarCompletionSchema,
    checklistSettingsSchema,
} from "../daily-checklist";
import {
    recordDailyAdhkar,
    saveChecklistSettings,
} from "./daily-checklist-service";

function refresh() {
    for (const route of ["/plans/today", "/dashboard", "/azkar", "/weekly"])
        revalidatePath(route);
}

export async function updateChecklistSettings(input: unknown) {
    const session = await auth.api.getSession({ headers: await headers() });
    const parsed = checklistSettingsSchema.safeParse(input);
    if (!session || !parsed.success)
        return { success: false as const, reason: "invalid" as const };
    try {
        const result = await saveChecklistSettings(
            session.user.id,
            parsed.data,
        );
        if (result.success) refresh();
        return result;
    } catch {
        return { success: false as const, reason: "failed" as const };
    }
}

export async function setDailyAdhkarCompletion(input: unknown) {
    const session = await auth.api.getSession({ headers: await headers() });
    const parsed = adhkarCompletionSchema.safeParse(input);
    if (!session || !parsed.success)
        return { success: false as const, reason: "invalid" as const };
    try {
        const result = await recordDailyAdhkar(session.user.id, parsed.data);
        if (result.success) refresh();
        return result;
    } catch {
        return { success: false as const, reason: "failed" as const };
    }
}
