"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMember, memorizationGroup } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

export async function removeGroupMember(input: unknown) {
    const parsed = z
        .object({ groupId: z.string().min(1), membershipId: z.string().min(1) })
        .safeParse(input);
    const session = await auth.api.getSession({ headers: await headers() });
    if (!parsed.success || !session)
        return { success: false, reason: "unauthorized" };
    const result = await db.transaction(async (tx) => {
        // Serialize with reassignment so a newly promoted supervisor cannot be removed.
        await tx
            .select({ id: memorizationGroup.id })
            .from(memorizationGroup)
            .where(eq(memorizationGroup.id, parsed.data.groupId))
            .for("update");
        const [caller] = await tx
            .select()
            .from(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.userId, session.user.id),
                ),
            );
        if (caller?.role !== "supervisor")
            return { success: false, reason: "unauthorized" };
        const removed = await tx
            .delete(groupMember)
            .where(
                and(
                    eq(groupMember.id, parsed.data.membershipId),
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.role, "member"),
                ),
            )
            .returning({ id: groupMember.id });
        return removed.length
            ? { success: true }
            : { success: false, reason: "meeting_host" };
    });
    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return result;
}

export async function leaveGroup(input: unknown) {
    const parsed = z.object({ groupId: z.string().min(1) }).safeParse(input);
    const session = await auth.api.getSession({ headers: await headers() });
    if (!parsed.success || !session)
        return { success: false, reason: "unauthorized" };
    const result = await db.transaction(async (tx) => {
        await tx
            .select({ id: memorizationGroup.id })
            .from(memorizationGroup)
            .where(eq(memorizationGroup.id, parsed.data.groupId))
            .for("update");
        const removed = await tx
            .delete(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.userId, session.user.id),
                    eq(groupMember.role, "member"),
                ),
            )
            .returning({ id: groupMember.id });
        return removed.length
            ? { success: true }
            : { success: false, reason: "meeting_host" };
    });
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return result;
}

/** Review access is independent of management and applies only in this circle. */
export async function setGroupReviewer(input: unknown) {
    const parsed = z
        .object({
            groupId: z.string().min(1),
            membershipId: z.string().min(1),
            reviewerRole: z.enum(["none", "all", "supervisor"]),
        })
        .safeParse(input);
    const session = await auth.api.getSession({ headers: await headers() });
    if (!parsed.success || !session)
        return { success: false, reason: "unauthorized" };
    const result = await db.transaction(async (tx) => {
        // Serialize with membership removal and supervisor reassignment.
        await tx
            .select({ id: memorizationGroup.id })
            .from(memorizationGroup)
            .where(eq(memorizationGroup.id, parsed.data.groupId))
            .for("update");
        const [caller] = await tx
            .select()
            .from(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.userId, session.user.id),
                ),
            );
        if (caller?.role !== "supervisor")
            return { success: false, reason: "unauthorized" };
        const updated = await tx
            .update(groupMember)
            .set({
                isReviewer: parsed.data.reviewerRole !== "none",
                reviewerScope:
                    parsed.data.reviewerRole === "supervisor"
                        ? "supervisor"
                        : "all",
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(groupMember.id, parsed.data.membershipId),
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.role, "member"),
                ),
            )
            .returning({ id: groupMember.id });
        return { success: updated.length > 0 };
    });
    revalidatePath(`/groups/${parsed.data.groupId}`, "layout");
    revalidatePath("/groups");
    revalidatePath("/assignments");
    return result;
}
