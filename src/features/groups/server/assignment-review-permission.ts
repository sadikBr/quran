import "server-only";

import { eq, or, sql } from "drizzle-orm";
import { groupMember, practiceAssignment } from "@/drizzle/schema";

/** No member can evaluate their own work, regardless of their role. */
export function assignmentReviewPermission(userId: string) {
    return sql<boolean>`${practiceAssignment.assigneeId} <> ${userId}
        and exists (select 1 from ${groupMember} as reviewer
            where reviewer.group_id = ${practiceAssignment.groupId}
            and reviewer.user_id = ${userId}
            and (reviewer.role = 'supervisor'
                or (reviewer.is_reviewer = true
                    and (reviewer.reviewer_scope = 'all'
                        or (reviewer.reviewer_scope = 'supervisor'
                            and exists (select 1 from ${groupMember} as assignee
                                where assignee.group_id = ${practiceAssignment.groupId}
                                and assignee.user_id = ${practiceAssignment.assigneeId}
                                and assignee.role = 'supervisor'))))))`;
}

/** Use alongside a current circle-membership check. Owners can still read feedback. */
export function assignmentReadPermission(userId: string) {
    return or(
        eq(practiceAssignment.assigneeId, userId),
        assignmentReviewPermission(userId),
    );
}
