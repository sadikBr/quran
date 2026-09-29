import "server-only";

import { and, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingSchedule,
    groupMember,
    memorizationGroup,
} from "@/drizzle/schema";
import { calculateMeetingState } from "./meeting-schedule";

export interface NextGroupMeeting {
    groupId: string;
    groupName: string;
    startsAt: string;
    timezone: string;
    status: "active" | "upcoming";
}

export async function getNextGroupMeetingForUser(
    userId: string,
    now = new Date(),
): Promise<NextGroupMeeting | null> {
    const rows = await db
        .select({
            id: groupMeeting.id,
            groupId: groupMeeting.groupId,
            groupName: memorizationGroup.name,
            timezone: groupMeeting.timezone,
            activeWindowMinutes: groupMeeting.activeWindowMinutes,
            enabled: groupMeeting.enabled,
            weekday: groupMeetingSchedule.weekday,
            localTime: groupMeetingSchedule.localTime,
        })
        .from(groupMeeting)
        .innerJoin(
            groupMember,
            and(
                eq(groupMeeting.groupId, groupMember.groupId),
                eq(groupMember.userId, userId),
            ),
        )
        .innerJoin(
            memorizationGroup,
            eq(groupMeeting.groupId, memorizationGroup.id),
        )
        .innerJoin(
            groupMeetingSchedule,
            eq(groupMeeting.id, groupMeetingSchedule.meetingId),
        );

    const meetings = new Map<
        string,
        Omit<NextGroupMeeting, "startsAt" | "status"> & {
            activeWindowMinutes: number;
            enabled: boolean;
            schedule: Array<{ weekday: number; localTime: string }>;
        }
    >();

    for (const row of rows) {
        const meeting = meetings.get(row.id) ?? {
            groupId: row.groupId,
            groupName: row.groupName,
            timezone: row.timezone,
            activeWindowMinutes: row.activeWindowMinutes,
            enabled: row.enabled,
            schedule: [],
        };
        meeting.schedule.push({
            weekday: row.weekday,
            localTime: row.localTime,
        });
        meetings.set(row.id, meeting);
    }

    const visibleMeetings: NextGroupMeeting[] = [];

    for (const meeting of meetings.values()) {
        const state = calculateMeetingState({ ...meeting, now });
        const startsAt =
            state.status === "active"
                ? state.activeStartsAt
                : state.nextStartsAt;
        if (!startsAt || state.status === "disabled") continue;

        visibleMeetings.push({
            groupId: meeting.groupId,
            groupName: meeting.groupName,
            startsAt,
            timezone: meeting.timezone,
            status: state.status,
        });
    }

    return (
        visibleMeetings.sort((a, b) => {
            if (a.status !== b.status) return a.status === "active" ? -1 : 1;
            return (
                new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
            );
        })[0] ?? null
    );
}
