"use server";

import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    adminActivity,
    groupMeeting,
    groupMember,
    memorizationGroup,
    user,
} from "@/drizzle/schema";
import { getPlatformAdmin } from "@/features/auth/permissions";

export async function searchSupervisorCandidates(query: string) {
    if (
        !(await getPlatformAdmin()) ||
        typeof query !== "string" ||
        query.trim().length < 2
    )
        return [];
    const search = query
        .trim()
        .slice(0, 100)
        .replace(/[\\%_]/g, "\\$&");
    return db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(
            and(
                eq(user.role, "member"),
                isNull(user.suspendedAt),
                or(
                    ilike(user.name, `%${search}%`),
                    ilike(user.email, `%${search}%`),
                ),
            ),
        )
        .orderBy(user.name, user.id)
        .limit(20);
}

export async function replaceSupervisor(input: unknown) {
    const admin = await getPlatformAdmin();
    const parsed = z
        .object({ groupId: z.string().min(1), supervisorId: z.string().min(1) })
        .safeParse(input);
    if (!admin || !parsed.success)
        return { success: false, reason: "unauthorized" };
    const { groupId, supervisorId } = parsed.data;
    const result = await db.transaction(async (tx) => {
        const [circle] = await tx
            .select()
            .from(memorizationGroup)
            .where(eq(memorizationGroup.id, groupId))
            .for("update");
        if (!circle) return { success: false, reason: "not_found" };
        const [meeting] = await tx
            .select()
            .from(groupMeeting)
            .where(eq(groupMeeting.groupId, groupId))
            .for("update");
        if (meeting?.hostActiveUntil && meeting.hostActiveUntil > new Date())
            return { success: false, reason: "active_meeting" };
        const [target] = await tx
            .select()
            .from(user)
            .where(eq(user.id, supervisorId))
            .for("update");
        if (!target || target.role !== "member" || target.suspendedAt)
            return { success: false, reason: "invalid" };
        const [previous] = await tx
            .select()
            .from(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, groupId),
                    eq(groupMember.role, "supervisor"),
                ),
            );
        if (previous?.userId === supervisorId) return { success: true };
        if (previous)
            await tx
                .update(groupMember)
                .set({ role: "member", updatedAt: new Date() })
                .where(eq(groupMember.id, previous.id));
        await tx
            .insert(groupMember)
            .values({
                id: crypto.randomUUID(),
                groupId,
                userId: supervisorId,
                role: "supervisor",
            })
            .onConflictDoUpdate({
                target: [groupMember.groupId, groupMember.userId],
                set: { role: "supervisor", updatedAt: new Date() },
            });
        // A new room invalidates access to the new meeting using an old host's JWT.
        if (meeting)
            await tx
                .update(groupMeeting)
                .set({
                    hostUserId: supervisorId,
                    enabled: true,
                    roomName: `circle-${crypto.randomUUID()}`,
                    hostActiveUntil: null,
                    updatedAt: new Date(),
                })
                .where(eq(groupMeeting.id, meeting.id));
        await tx.insert(adminActivity).values({
            id: crypto.randomUUID(),
            actorId: admin.id,
            action: "supervisor_changed",
            groupId,
            groupName: circle.name,
            details: {
                previousSupervisorId: previous?.userId,
                supervisorId,
            },
        });
        return { success: true };
    });
    revalidatePath("/admin");
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    revalidatePath("/assignments");
    return result;
}

export async function deleteCircle(input: unknown) {
    const admin = await getPlatformAdmin();
    const parsed = z
        .object({ groupId: z.string().min(1), confirmation: z.string() })
        .safeParse(input);
    if (!admin || !parsed.success)
        return { success: false, reason: "unauthorized" };
    const result = await db.transaction(async (tx) => {
        const [circle] = await tx
            .select()
            .from(memorizationGroup)
            .where(eq(memorizationGroup.id, parsed.data.groupId))
            .for("update");
        if (!circle || parsed.data.confirmation !== circle.name)
            return { success: false, reason: "invalid" };
        const [meeting] = await tx
            .select()
            .from(groupMeeting)
            .where(eq(groupMeeting.groupId, circle.id))
            .for("update");
        if (meeting?.hostActiveUntil && meeting.hostActiveUntil > new Date())
            return { success: false, reason: "active_meeting" };
        await tx.insert(adminActivity).values({
            id: crypto.randomUUID(),
            actorId: admin.id,
            action: "circle_deleted",
            groupId: circle.id,
            groupName: circle.name,
            details: {},
        });
        await tx
            .delete(memorizationGroup)
            .where(eq(memorizationGroup.id, circle.id));
        return { success: true };
    });
    revalidatePath("/admin");
    revalidatePath("/groups");
    revalidatePath("/assignments");
    revalidatePath("/dashboard");
    return result;
}

export async function updateCircle(input: unknown) {
    const admin = await getPlatformAdmin();
    const parsed = z
        .object({
            groupId: z.string().min(1),
            name: z.string().trim().min(2).max(80),
            description: z.string().trim().max(300),
        })
        .safeParse(input);
    if (!admin || !parsed.success)
        return { success: false, reason: "unauthorized" };
    const result = await db.transaction(async (tx) => {
        const [circle] = await tx
            .update(memorizationGroup)
            .set({
                name: parsed.data.name,
                description: parsed.data.description || null,
                updatedAt: new Date(),
            })
            .where(eq(memorizationGroup.id, parsed.data.groupId))
            .returning();
        if (!circle) return { success: false, reason: "not_found" };
        await tx.insert(adminActivity).values({
            id: crypto.randomUUID(),
            actorId: admin.id,
            action: "circle_updated",
            groupId: circle.id,
            groupName: circle.name,
            details: {},
        });
        return { success: true };
    });
    revalidatePath("/admin");
    revalidatePath("/groups");
    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/dashboard");
    revalidatePath("/assignments");
    return result;
}
