import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import db from "@/drizzle/db";
import { groupMember, practiceAssignment, user } from "@/drizzle/schema";
import { assignmentReviewPermission } from "./assignment-review-permission";
import {
    attendedAssignment,
    getLiveReviewContext,
} from "./live-review-context";

// Keep the queue scoped to the authenticated member's permitted assignments in the selected circle.
export default async function getReviewQueue(
    groupId: string,
    userId: string,
    occurrence: string,
) {
    const context = await getLiveReviewContext(groupId, userId, occurrence);
    if (!context) return [];
    return db
        .select({ id: practiceAssignment.id, name: user.name })
        .from(practiceAssignment)
        .innerJoin(user, eq(user.id, practiceAssignment.assigneeId))
        .innerJoin(
            groupMember,
            and(
                eq(groupMember.groupId, practiceAssignment.groupId),
                eq(groupMember.userId, userId),
                assignmentReviewPermission(userId),
            ),
        )
        .where(
            and(
                eq(practiceAssignment.groupId, groupId),
                inArray(practiceAssignment.status, [
                    "submitted",
                    "in_progress",
                    "needs_revision",
                ]),
                attendedAssignment(context.id, context.startsAt),
            ),
        )
        .orderBy(
            asc(practiceAssignment.submittedAt),
            asc(practiceAssignment.id),
        );
}
