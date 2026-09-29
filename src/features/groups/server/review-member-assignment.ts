"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMember, practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { sendAssignmentNotification } from "@/features/notifications/server/assignment-notifications";

const inputSchema = z.object({
    groupId: z.string().min(1),
    assignmentId: z.string().min(1),
    decision: z.enum(["completed", "needs_revision"]),
    note: z.string().trim().max(1000).optional(),
});

export default async function reviewMemberAssignment(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const, reason: "unauthorized" };

    const [admin] = await db
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, parsed.data.groupId),
                eq(groupMember.userId, session.user.id),
                eq(groupMember.role, "supervisor"),
            ),
        )
        .limit(1);
    if (!admin) return { success: false as const, reason: "unauthorized" };

    const needsMoreWork = parsed.data.decision === "needs_revision";
    const updated = await db
        .update(practiceAssignment)
        .set({
            status: parsed.data.decision,
            reviewNote: parsed.data.note || null,
            reviewedAt: new Date(),
            submittedAt: needsMoreWork ? null : undefined,
            progressSurahNumber: needsMoreWork ? null : undefined,
            progressAyahNumber: needsMoreWork ? null : undefined,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(practiceAssignment.id, parsed.data.assignmentId),
                eq(practiceAssignment.groupId, parsed.data.groupId),
                eq(practiceAssignment.status, "submitted"),
            ),
        )
        .returning({ id: practiceAssignment.id });

    if (updated.length === 0) {
        return { success: false as const, reason: "not_submitted" };
    }

    after(async () => {
        await Promise.allSettled([
            sendAssignmentNotification(
                parsed.data.assignmentId,
                parsed.data.decision === "completed"
                    ? "review_completed"
                    : "review_needs_revision",
            ),
        ]);
    });

    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath(
        `/groups/${parsed.data.groupId}/review/${parsed.data.assignmentId}`,
    );
    revalidatePath("/assignments");
    revalidatePath("/practice");
    revalidatePath("/dashboard");
    return { success: true as const };
}
