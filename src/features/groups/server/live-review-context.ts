import "server-only";
import { and, eq, gt, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
    practiceAssignment,
} from "@/drizzle/schema";
import { activeGroupOccurrence } from "./group-workflow";

/** A scheduled window alone never grants review permission. */
export async function getLiveReviewContext(
    groupId: string,
    userId: string,
    occurrence: string,
    executor: Pick<typeof db, "select"> = db,
    lock = false,
) {
    const date = new Date(occurrence);
    if (Number.isNaN(date.getTime())) return null;
    const query = executor
        .select({
            id: groupMeetingSession.id,
            startsAt: groupMeetingSession.scheduledStartsAt,
        })
        .from(groupMeetingSession)
        .innerJoin(
            groupMeeting,
            eq(groupMeeting.id, groupMeetingSession.meetingId),
        )
        .innerJoin(
            groupMember,
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, userId),
                or(
                    eq(groupMember.role, "supervisor"),
                    eq(groupMember.isReviewer, true),
                ),
            ),
        )
        .innerJoin(
            groupMeetingAttendance,
            and(
                eq(groupMeetingAttendance.sessionId, groupMeetingSession.id),
                eq(groupMeetingAttendance.userId, userId),
            ),
        )
        .where(
            and(
                eq(groupMeeting.groupId, groupId),
                activeGroupOccurrence(
                    groupMeeting.groupId,
                    groupMeetingSession.scheduledStartsAt,
                ),
                eq(groupMeeting.enabled, true),
                eq(groupMeetingSession.scheduledStartsAt, date),
                isNotNull(groupMeetingSession.startedAt),
                isNull(groupMeetingSession.endedAt),
                isNull(groupMeetingSession.finalizedAt),
                isNull(groupMeetingSession.cancelledAt),
                lte(
                    groupMeetingSession.scheduledStartsAt,
                    sql`clock_timestamp()`,
                ),
                gt(groupMeetingSession.scheduledEndsAt, sql`clock_timestamp()`),
                isNotNull(groupMeetingAttendance.joinedAt),
                isNotNull(groupMeetingAttendance.activeJoinedAt),
                gt(
                    groupMeetingAttendance.lastSeenAt,
                    sql`clock_timestamp() - interval '75 seconds'`,
                ),
            ),
        )
        .limit(1);
    const [context] = lock
        ? await query.for("update", { of: [groupMeetingSession, groupMember] })
        : await query;
    return context ?? null;
}

/** Include attended members even after they disconnect, but never future work. */
export function attendedAssignment(sessionId: string, startsAt: Date) {
    return and(
        sql`(${practiceAssignment.dueAt} is null or ${practiceAssignment.dueAt} <= ${startsAt.toISOString()}::timestamptz)`,
        sql`exists (select 1 from ${groupMeetingAttendance} where ${groupMeetingAttendance.sessionId} = ${sessionId} and ${groupMeetingAttendance.userId} = ${practiceAssignment.assigneeId} and ${groupMeetingAttendance.joinedAt} is not null)`,
    );
}
