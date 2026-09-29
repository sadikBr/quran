import "server-only";

import { and, asc, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { groupMember, practiceAssignment } from "@/drizzle/schema";

// Keep the queue scoped to the authenticated supervisor's selected circle.
export default async function getReviewQueue(groupId: string, userId: string) {
    return db
        .select({ id: practiceAssignment.id })
        .from(practiceAssignment)
        .innerJoin(
            groupMember,
            and(
                eq(groupMember.groupId, practiceAssignment.groupId),
                eq(groupMember.userId, userId),
                eq(groupMember.role, "supervisor"),
            ),
        )
        .where(
            and(
                eq(practiceAssignment.groupId, groupId),
                eq(practiceAssignment.status, "submitted"),
            ),
        )
        .orderBy(
            asc(practiceAssignment.submittedAt),
            asc(practiceAssignment.id),
        );
}
