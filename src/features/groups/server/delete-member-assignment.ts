"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMember, practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const inputSchema = z.object({
    groupId: z.string().min(1),
    assignmentId: z.string().min(1),
});

export default async function deleteMemberAssignment(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };

    const [admin] = await db
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, parsed.data.groupId),
                eq(groupMember.userId, session.user.id),
                eq(groupMember.role, "admin"),
            ),
        )
        .limit(1);
    if (!admin) return { success: false as const };

    const deleted = await db
        .delete(practiceAssignment)
        .where(
            and(
                eq(practiceAssignment.id, parsed.data.assignmentId),
                eq(practiceAssignment.groupId, parsed.data.groupId),
                isNotNull(practiceAssignment.groupId),
            ),
        )
        .returning({ id: practiceAssignment.id });
    if (deleted.length === 0) return { success: false as const };

    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/assignments");
    revalidatePath("/practice");
    revalidatePath("/dashboard");
    return { success: true as const };
}
