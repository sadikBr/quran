"use server";

import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMember, practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { sendAssignmentNotification } from "@/features/notifications/server/assignment-notifications";
import { getGroupMeetingForUser } from "./get-group-meeting";
import getReviewQueue from "./get-review-queue";
import { getRevisionMeetingDate } from "./revision-meeting";

const inputSchema = z.object({
    groupId: z.string().min(1),
    assignmentId: z.string().min(1),
    decision: z.enum(["completed", "needs_revision", "not_completed"]),
    note: z.string().trim().max(1000).optional(),
    reviewNext: z.boolean().optional(),
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
    const reschedule =
        needsMoreWork || parsed.data.decision === "not_completed";
    const eligibleStatuses =
        parsed.data.decision === "not_completed"
            ? ["in_progress", "submitted", "needs_revision"]
            : ["submitted"];
    const reviewable = and(
        inArray(practiceAssignment.status, eligibleStatuses),
        or(
            eq(practiceAssignment.status, "submitted"),
            lte(practiceAssignment.dueAt, new Date()),
        ),
    );
    let revisedDueAt: Date | undefined;
    if (reschedule) {
        const [assignment] = await db
            .select({ dueAt: practiceAssignment.dueAt })
            .from(practiceAssignment)
            .where(
                and(
                    eq(practiceAssignment.id, parsed.data.assignmentId),
                    eq(practiceAssignment.groupId, parsed.data.groupId),
                    reviewable,
                ),
            )
            .limit(1);
        if (!assignment)
            return { success: false as const, reason: "not_submitted" };
        const meeting = await getGroupMeetingForUser(
            parsed.data.groupId,
            session.user.id,
        );
        const nextMeeting = getRevisionMeetingDate(meeting, assignment.dueAt);
        if (!nextMeeting)
            return { success: false as const, reason: "no_next_meeting" };
        revisedDueAt = nextMeeting;
    }
    const updated = await db
        .update(practiceAssignment)
        .set({
            status: parsed.data.decision,
            kind: needsMoreWork ? "revision" : undefined,
            dueAt: revisedDueAt,
            reviewNote: parsed.data.note || null,
            reviewedForDueAt: sql`${practiceAssignment.dueAt}`,
            reviewedAt: new Date(),
            submittedAt: reschedule ? null : undefined,
            progressSurahNumber: reschedule ? null : undefined,
            progressAyahNumber: reschedule ? null : undefined,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(practiceAssignment.id, parsed.data.assignmentId),
                eq(practiceAssignment.groupId, parsed.data.groupId),
                reviewable,
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
                    : parsed.data.decision === "not_completed"
                      ? "review_not_completed"
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
    const queue = parsed.data.reviewNext
        ? await getReviewQueue(parsed.data.groupId, session.user.id)
        : [];
    return { success: true as const, nextAssignmentId: queue[0]?.id ?? null };
}
