"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMember, memorizationGroup } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const memberInputSchema = z.object({
    groupId: z.string().min(1),
    membershipId: z.string().min(1),
});

async function getSessionUserId() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user.id ?? null;
}

async function isAdmin(groupId: string, userId: string) {
    const [membership] = await db
        .select({ role: groupMember.role })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, userId),
                eq(groupMember.role, "admin"),
            ),
        )
        .limit(1);
    return Boolean(membership);
}

async function adminCount(groupId: string) {
    const [result] = await db
        .select({ value: count(groupMember.id) })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.role, "admin"),
            ),
        );
    return result?.value ?? 0;
}

export async function updateMemberRole(input: unknown) {
    const parsed = memberInputSchema
        .extend({ role: z.enum(["admin", "member"]) })
        .safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const userId = await getSessionUserId();
    if (!userId || !(await isAdmin(parsed.data.groupId, userId))) {
        return { success: false as const, reason: "unauthorized" };
    }

    const [target] = await db
        .select({ role: groupMember.role })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.id, parsed.data.membershipId),
                eq(groupMember.groupId, parsed.data.groupId),
            ),
        )
        .limit(1);
    if (!target) return { success: false as const, reason: "not_found" };

    if (
        target.role === "admin" &&
        parsed.data.role === "member" &&
        (await adminCount(parsed.data.groupId)) <= 1
    ) {
        return { success: false as const, reason: "last_admin" };
    }

    await db
        .update(groupMember)
        .set({ role: parsed.data.role, updatedAt: new Date() })
        .where(eq(groupMember.id, parsed.data.membershipId));

    revalidatePath(`/groups/${parsed.data.groupId}`);
    return { success: true as const };
}

export async function removeGroupMember(input: unknown) {
    const parsed = memberInputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const userId = await getSessionUserId();
    if (!userId || !(await isAdmin(parsed.data.groupId, userId))) {
        return { success: false as const, reason: "unauthorized" };
    }

    const [target] = await db
        .select({ role: groupMember.role })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.id, parsed.data.membershipId),
                eq(groupMember.groupId, parsed.data.groupId),
            ),
        )
        .limit(1);
    if (!target) return { success: false as const, reason: "not_found" };
    if (
        target.role === "admin" &&
        (await adminCount(parsed.data.groupId)) <= 1
    ) {
        return { success: false as const, reason: "last_admin" };
    }

    await db
        .delete(groupMember)
        .where(eq(groupMember.id, parsed.data.membershipId));
    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return { success: true as const };
}

export async function leaveGroup(input: unknown) {
    const parsed = z.object({ groupId: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const userId = await getSessionUserId();
    if (!userId) return { success: false as const, reason: "unauthorized" };

    const [membership] = await db
        .select({ id: groupMember.id, role: groupMember.role })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, parsed.data.groupId),
                eq(groupMember.userId, userId),
            ),
        )
        .limit(1);
    if (!membership) return { success: false as const, reason: "not_found" };
    if (
        membership.role === "admin" &&
        (await adminCount(parsed.data.groupId)) <= 1
    ) {
        return { success: false as const, reason: "last_admin" };
    }

    await db.delete(groupMember).where(eq(groupMember.id, membership.id));
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return { success: true as const };
}

export async function deleteGroup(input: unknown) {
    const parsed = z.object({ groupId: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return { success: false as const };

    const userId = await getSessionUserId();
    if (!userId || !(await isAdmin(parsed.data.groupId, userId))) {
        return { success: false as const };
    }

    await db
        .delete(memorizationGroup)
        .where(eq(memorizationGroup.id, parsed.data.groupId));
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return { success: true as const };
}
