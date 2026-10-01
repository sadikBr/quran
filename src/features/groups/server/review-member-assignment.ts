"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMeetingSession, practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { sendAssignmentNotification } from "@/features/notifications/server/assignment-notifications";
import { getGroupMeetingForUser } from "./get-group-meeting";
import getReviewQueue from "./get-review-queue";
import {
    attendedAssignment,
    getLiveReviewContext,
} from "./live-review-context";
import { getRevisionMeetingDate } from "./revision-meeting";

const inputSchema = z.object({
    groupId: z.string().min(1),
    assignmentId: z.string().min(1),
    occurrence: z.string().datetime(),
    decision: z.enum(["completed", "needs_revision", "not_completed"]),
    note: z.string().trim().max(1000).optional(),
    reviewNext: z.boolean().optional(),
});

export default async function reviewMemberAssignment(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const, reason: "unauthorized" };
    const data = parsed.data;
    const meeting = await getGroupMeetingForUser(data.groupId, session.user.id);
    const reschedule = data.decision !== "completed";
    const result = await db.transaction(async (tx) => {
        // Use the same session lock as meeting closure, preventing late reviews.
        const context = await getLiveReviewContext(
            data.groupId,
            session.user.id,
            data.occurrence,
            tx,
            true,
        );
        if (!context)
            return { success: false as const, reason: "meeting_required" };
        const eligible =
            data.decision === "not_completed"
                ? ["submitted", "in_progress", "needs_revision"]
                : ["submitted"];
        const conditions = and(
            eq(practiceAssignment.id, data.assignmentId),
            eq(practiceAssignment.groupId, data.groupId),
            inArray(practiceAssignment.status, eligible),
            attendedAssignment(context.id, context.startsAt),
        );
        const [assignment] = await tx
            .select({ dueAt: practiceAssignment.dueAt })
            .from(practiceAssignment)
            .where(conditions)
            .for("update");
        if (!assignment)
            return { success: false as const, reason: "not_submitted" };
        // Carried-over work must go after THIS meeting, not its old deadline.
        const next = reschedule
            ? getRevisionMeetingDate(meeting, context.startsAt)
            : null;
        if (reschedule && !next)
            return { success: false as const, reason: "no_next_meeting" };
        const updated = await tx
            .update(practiceAssignment)
            .set({
                status: data.decision,
                kind:
                    data.decision === "needs_revision" ? "revision" : undefined,
                dueAt: next ?? undefined,
                reviewNote: data.note || null,
                reviewedForDueAt: context.startsAt,
                reviewedAt: new Date(),
                submittedAt: reschedule ? null : undefined,
                progressSurahNumber: reschedule ? null : undefined,
                progressAyahNumber: reschedule ? null : undefined,
                updatedAt: new Date(),
            })
            .where(
                and(
                    conditions,
                    sql`exists (select 1 from ${groupMeetingSession} where ${groupMeetingSession.id} = ${context.id} and ${groupMeetingSession.scheduledEndsAt} > clock_timestamp())`,
                ),
            )
            .returning({ id: practiceAssignment.id });
        return updated.length
            ? { success: true as const }
            : { success: false as const, reason: "meeting_required" };
    });
    if (!result.success) return result;
    after(async () => {
        await Promise.allSettled([
            sendAssignmentNotification(
                data.assignmentId,
                data.decision === "completed"
                    ? "review_completed"
                    : data.decision === "not_completed"
                      ? "review_not_completed"
                      : "review_needs_revision",
            ),
        ]);
    });
    revalidatePath(`/groups/${data.groupId}`);
    revalidatePath(`/groups/${data.groupId}/review/${data.assignmentId}`);
    revalidatePath("/assignments");
    revalidatePath("/practice");
    revalidatePath("/dashboard");
    const queue = data.reviewNext
        ? await getReviewQueue(data.groupId, session.user.id, data.occurrence)
        : [];
    return { success: true as const, nextAssignmentId: queue[0]?.id ?? null };
}
