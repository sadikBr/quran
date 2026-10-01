import "server-only";

import { and, asc, eq, gte, isNotNull } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingSchedule,
    groupMeetingSession,
    groupMember,
    memorizationGroup,
    user,
} from "@/drizzle/schema";
import type { GroupMeetingDetails } from "../meeting-types";

export async function getGroupMeetingForUser(
    groupId: string,
    userId: string,
    executor: Pick<typeof db, "select"> = db,
): Promise<GroupMeetingDetails | null> {
    const [meeting] = await executor
        .select({
            id: groupMeeting.id,
            groupId: groupMeeting.groupId,
            hostUserId: groupMeeting.hostUserId,
            hostName: user.name,
            roomName: groupMeeting.roomName,
            timezone: groupMeeting.timezone,
            activeWindowMinutes: groupMeeting.activeWindowMinutes,
            hostActiveUntil: groupMeeting.hostActiveUntil,
            enabled: groupMeeting.enabled,
            groupActive: memorizationGroup.isActive,
            activeSince: memorizationGroup.activeSince,
            rescheduledOccurrences: groupMeeting.rescheduledOccurrences,
        })
        .from(groupMeeting)
        .innerJoin(
            memorizationGroup,
            eq(memorizationGroup.id, groupMeeting.groupId),
        )
        .innerJoin(
            groupMember,
            and(
                eq(groupMember.groupId, groupMeeting.groupId),
                eq(groupMember.userId, userId),
            ),
        )
        .innerJoin(user, eq(user.id, groupMeeting.hostUserId))
        .where(eq(groupMeeting.groupId, groupId))
        .limit(1);

    if (!meeting?.hostUserId) return null;

    const schedule = await executor
        .select({
            weekday: groupMeetingSchedule.weekday,
            localTime: groupMeetingSchedule.localTime,
        })
        .from(groupMeetingSchedule)
        .where(eq(groupMeetingSchedule.meetingId, meeting.id))
        .orderBy(
            asc(groupMeetingSchedule.weekday),
            asc(groupMeetingSchedule.localTime),
        );

    const closed = await executor
        .select({ startsAt: groupMeetingSession.scheduledStartsAt })
        .from(groupMeetingSession)
        .where(
            and(
                eq(groupMeetingSession.meetingId, meeting.id),
                isNotNull(groupMeetingSession.finalizedAt),
                gte(
                    groupMeetingSession.scheduledStartsAt,
                    new Date(Date.now() - 7 * 86400000),
                ),
            ),
        );
    return {
        ...meeting,
        hostUserId: meeting.hostUserId,
        schedule,
        closedOccurrences: closed.map((row) => row.startsAt.toISOString()),
    };
}
