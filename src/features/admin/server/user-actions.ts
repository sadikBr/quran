"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import db from "@/drizzle/db";
import * as s from "@/drizzle/schema";
import { getPlatformAdmin } from "@/features/auth/permissions";
import { DEFAULT_PREFERENCES } from "@/features/settings/preferences";
import { getUserDataSummary, personalData } from "./user-service";

export async function previewUserReset(userId: string) {
    if (!(await getPlatformAdmin()) || typeof userId !== "string") return null;
    const [account] = await db
        .select({ role: s.user.role, updatedAt: s.user.updatedAt })
        .from(s.user)
        .where(eq(s.user.id, userId));
    if (!account || account.role === "admin") return null;
    return {
        summary: await getUserDataSummary(userId),
        updatedAt: account.updatedAt.toISOString(),
    };
}

const actionSchema = z.object({
    userId: z.string().min(1).max(200),
    action: z.enum(["reset", "suspend", "reactivate", "sign_out"]),
    reason: z.string().trim().min(3).max(500),
    confirmation: z.string().max(320),
    expectedUpdatedAt: z.iso.datetime(),
});

export async function manageUser(input: unknown) {
    const admin = await getPlatformAdmin();
    if (!admin) return { success: false, reason: "unauthorized" } as const;
    const parsed = actionSchema.safeParse(input);
    if (!parsed.success) return { success: false, reason: "invalid" } as const;
    const { userId, action, confirmation, reason, expectedUpdatedAt } =
        parsed.data;
    const result = await db.transaction(async (tx) => {
        const [account] = await tx
            .select()
            .from(s.user)
            .where(eq(s.user.id, userId))
            .for("update");
        if (!account) return { success: false, reason: "not_found" } as const;
        if (account.role === "admin" || account.id === admin.id)
            return { success: false, reason: "protected" } as const;
        if (account.updatedAt.toISOString() !== expectedUpdatedAt)
            return { success: false, reason: "stale" } as const;
        if (
            action === "reset" &&
            confirmation.trim().toLowerCase() !== account.email.toLowerCase()
        )
            return { success: false, reason: "confirmation" } as const;
        if (
            (action === "suspend" && account.suspendedAt) ||
            (action === "reactivate" && !account.suspendedAt)
        )
            return { success: false, reason: "stale" } as const;
        if (action === "reset" || action === "suspend") {
            const [supervised] = await tx
                .select({ id: s.groupMember.id })
                .from(s.groupMember)
                .where(
                    and(
                        eq(s.groupMember.userId, userId),
                        eq(s.groupMember.role, "supervisor"),
                    ),
                )
                .limit(1);
            const [hosted] = await tx
                .select({ id: s.groupMeeting.id })
                .from(s.groupMeeting)
                .where(eq(s.groupMeeting.hostUserId, userId))
                .limit(1);
            if (supervised || hosted)
                return { success: false, reason: "supervisor" } as const;
        }
        if (action !== "reactivate") {
            const [live] = await tx
                .select({ id: s.groupMeeting.id })
                .from(s.groupMeeting)
                .where(
                    and(
                        eq(s.groupMeeting.hostUserId, userId),
                        gt(s.groupMeeting.hostActiveUntil, new Date()),
                    ),
                )
                .limit(1);
            if (live)
                return { success: false, reason: "active_meeting" } as const;
        }
        const now = new Date();
        if (action === "reset") {
            await tx
                .delete(s.practiceAssignment)
                .where(eq(s.practiceAssignment.assigneeId, userId));
            for (const group of personalData) {
                for (const table of group.tables)
                    await tx.delete(table).where(eq(table.userId, userId));
            }
            await tx
                .insert(s.userSettings)
                .values({ userId, ...DEFAULT_PREFERENCES });
        } else if (action !== "reactivate") {
            await tx
                .delete(s.pushSubscription)
                .where(eq(s.pushSubscription.userId, userId));
            await tx.delete(s.session).where(eq(s.session.userId, userId));
        }
        await tx
            .update(s.user)
            .set({
                updatedAt: new Date(
                    Math.max(now.getTime(), account.updatedAt.getTime() + 1),
                ),
                ...(action === "reset" ? { dataResetAt: now } : {}),
                ...(action !== "reactivate" ? { sessionsRevokedAt: now } : {}),
                ...(action === "suspend"
                    ? { suspendedAt: now }
                    : action === "reactivate"
                      ? { suspendedAt: null }
                      : {}),
            })
            .where(eq(s.user.id, userId));
        await tx.insert(s.userAdminActivity).values({
            id: crypto.randomUUID(),
            actorId: admin.id,
            targetId: userId,
            targetName: account.name,
            action,
            reason,
        });
        return { success: true } as const;
    });
    if (result.success) {
        revalidatePath("/", "layout");
    }
    return result;
}
