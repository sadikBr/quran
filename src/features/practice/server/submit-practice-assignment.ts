"use server";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMember, practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { activeGroup } from "@/features/groups/server/group-workflow";

const inputSchema = z.object({
    assignmentId: z.string().min(1),
    confirmed: z.literal(true),
});

export default async function submitPracticeAssignment(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };

    const [assignment] = await db
        .update(practiceAssignment)
        .set({
            status: "submitted",
            submittedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(practiceAssignment.id, parsed.data.assignmentId),
                eq(practiceAssignment.assigneeId, session.user.id),
                isNotNull(practiceAssignment.groupId),
                activeGroup(practiceAssignment.groupId),
                inArray(practiceAssignment.status, [
                    "in_progress",
                    "needs_revision",
                    "not_completed",
                ]),
                sql`exists (select 1 from ${groupMember} where ${groupMember.groupId} = ${practiceAssignment.groupId} and ${groupMember.userId} = ${session.user.id})`,
            ),
        )
        .returning({
            id: practiceAssignment.id,
            groupId: practiceAssignment.groupId,
        });
    if (!assignment) return { success: false as const };

    revalidatePath("/practice");
    revalidatePath("/assignments");
    revalidatePath(`/practice/${assignment.id}/read`);
    if (assignment.groupId) revalidatePath(`/groups/${assignment.groupId}`);
    revalidatePath("/dashboard");
    return { success: true as const };
}
