"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMember, memorizationGroup } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const inputSchema = z.object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(300).optional(),
});

function createInviteCode() {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}

export default async function createGroup(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };

    const groupId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    try {
        await db.transaction(async (transaction) => {
            await transaction.insert(memorizationGroup).values({
                id: groupId,
                name: parsed.data.name,
                description: parsed.data.description || null,
                inviteCode: createInviteCode(),
                createdById: session.user.id,
            });
            await transaction.insert(groupMember).values({
                id: membershipId,
                groupId,
                userId: session.user.id,
                role: "admin",
            });
        });
    } catch {
        return { success: false as const };
    }

    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return { success: true as const, groupId };
}
