"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import { planningDraftSchema } from "../planner";
import { commitPlanningWeek } from "./service";

export async function savePlanningWeek(
    input: unknown,
    acknowledgeOverload: unknown = false,
) {
    const session = await auth.api.getSession({ headers: await headers() });
    const parsed = planningDraftSchema.safeParse(input);
    if (
        !session ||
        !parsed.success ||
        typeof acknowledgeOverload !== "boolean" ||
        (await isPlatformAdmin(session.user.id))
    )
        return { success: false as const, reason: "invalid" as const };
    try {
        const result = await commitPlanningWeek(
            session.user.id,
            parsed.data,
            acknowledgeOverload,
        );
        if (result.success)
            for (const path of [
                "/weekly",
                "/practice",
                "/memorization/plan",
                "/memorization/revision",
                "/dashboard",
                "/plans",
                "/plans/today",
                "/assignments",
            ])
                revalidatePath(path);
        return result;
    } catch {
        return { success: false as const, reason: "failed" as const };
    }
}
