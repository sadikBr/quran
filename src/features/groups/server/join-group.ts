"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMember, memorizationGroup } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const inputSchema = z.object({
    inviteCode: z.string().trim().min(1).max(30),
});

export default async function joinGroup(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const, reason: "unauthorized" };

    const [group] = await db
        .select({ id: memorizationGroup.id })
        .from(memorizationGroup)
        .where(
            eq(
                memorizationGroup.inviteCode,
                parsed.data.inviteCode.toUpperCase(),
            ),
        )
        .limit(1);

    if (!group) return { success: false as const, reason: "not_found" };

    try {
        await db
            .insert(groupMember)
            .values({
                id: crypto.randomUUID(),
                groupId: group.id,
                userId: session.user.id,
                role: "member",
            })
            .onConflictDoNothing();
    } catch {
        return { success: false as const, reason: "failed" };
    }

    revalidatePath("/groups");
    revalidatePath(`/groups/${group.id}`);
    revalidatePath("/dashboard");
    return { success: true as const, groupId: group.id };
}
