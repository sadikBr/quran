import "server-only";

import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
} from "@/drizzle/schema";
import { activeGroup } from "./group-workflow";

// Independent of history pagination, so older unexplained absences remain actionable.
export default async function getPendingAbsence(
    groupId: string,
    userId: string,
) {
    const [absence] = await db
        .select({
            id: groupMeetingAttendance.id,
            startsAt: groupMeetingSession.scheduledStartsAt,
        })
        .from(groupMeetingAttendance)
        .innerJoin(
            groupMeetingSession,
            eq(groupMeetingAttendance.sessionId, groupMeetingSession.id),
        )
        .innerJoin(
            groupMeeting,
            eq(groupMeetingSession.meetingId, groupMeeting.id),
        )
        .innerJoin(
            groupMember,
            and(
                eq(groupMember.groupId, groupMeeting.groupId),
                eq(groupMember.userId, userId),
            ),
        )
        .where(
            and(
                eq(groupMeeting.groupId, groupId),
                activeGroup(groupMeeting.groupId),
                eq(groupMeetingAttendance.userId, userId),
                eq(groupMeetingAttendance.status, "pending"),
                isNotNull(groupMeetingSession.finalizedAt),
                isNull(groupMeetingSession.cancelledAt),
                sql`nullif(trim(${groupMeetingAttendance.excuse}), '') is null`,
            ),
        )
        .orderBy(asc(groupMeetingSession.scheduledStartsAt))
        .limit(1);
    return absence ?? null;
}
