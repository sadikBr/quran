import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
    user,
} from "@/drizzle/schema";
import { finalizeEndedMeetingAttendance } from "./meeting-attendance";

const ACTIVE_GRACE_MS = 35_000;

export interface MeetingAttendanceHistory {
    id: string;
    userId: string;
    name: string;
    joinedAt: Date | null;
    leftAt: Date | null;
    durationSeconds: number;
    status: "present" | "pending" | "accepted" | "unaccepted";
    excuse: string | null;
}

export interface MeetingHistoryEntry {
    id: string;
    cancelledAt: Date | null;
    scheduledStartsAt: Date;
    startedAt: Date | null;
    endedAt: Date | null;
    durationSeconds: number;
    participantCount: number;
    attendance: MeetingAttendanceHistory[];
}

export default async function getMeetingHistory(
    groupId: string,
    requestingUserId: string,
    isAdmin: boolean,
    options: { limit?: number; offset?: number; pendingOnly?: boolean } = {},
): Promise<MeetingHistoryEntry[]> {
    const limit = Math.min(25, Math.max(1, options.limit ?? 10));
    const offset = Math.max(0, options.offset ?? 0);
    const [membership] = await db
        .select({ id: groupMember.id, role: groupMember.role })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, requestingUserId),
            ),
        )
        .limit(1);
    if (!membership) return [];
    const canReview = isAdmin && membership.role === "supervisor";

    // The cron normally finalizes an occurrence. This fallback also makes
    // completed meetings appear when running locally without the scheduler.
    await finalizeEndedMeetingAttendance();

    const sessions = await db
        .select({
            id: groupMeetingSession.id,
            scheduledStartsAt: groupMeetingSession.scheduledStartsAt,
            scheduledEndsAt: groupMeetingSession.scheduledEndsAt,
            startedAt: groupMeetingSession.startedAt,
            endedAt: groupMeetingSession.endedAt,
            cancelledAt: groupMeetingSession.cancelledAt,
        })
        .from(groupMeetingSession)
        .innerJoin(
            groupMeeting,
            eq(groupMeetingSession.meetingId, groupMeeting.id),
        )
        .where(
            and(
                eq(groupMeeting.groupId, groupId),
                isNotNull(groupMeetingSession.finalizedAt),
                options.pendingOnly && canReview
                    ? isNull(groupMeetingSession.cancelledAt)
                    : undefined,
                options.pendingOnly && canReview
                    ? inArray(
                          groupMeetingSession.id,
                          db
                              .select({
                                  sessionId: groupMeetingAttendance.sessionId,
                              })
                              .from(groupMeetingAttendance)
                              .where(
                                  eq(groupMeetingAttendance.status, "pending"),
                              ),
                      )
                    : undefined,
            ),
        )
        .orderBy(desc(groupMeetingSession.scheduledStartsAt))
        .limit(limit)
        .offset(offset);
    if (sessions.length === 0) return [];

    const attendanceRows = await db
        .select({
            id: groupMeetingAttendance.id,
            sessionId: groupMeetingAttendance.sessionId,
            userId: groupMeetingAttendance.userId,
            name: user.name,
            joinedAt: groupMeetingAttendance.joinedAt,
            activeJoinedAt: groupMeetingAttendance.activeJoinedAt,
            lastSeenAt: groupMeetingAttendance.lastSeenAt,
            leftAt: groupMeetingAttendance.leftAt,
            attendedSeconds: groupMeetingAttendance.attendedSeconds,
            status: groupMeetingAttendance.status,
            excuse: groupMeetingAttendance.excuse,
        })
        .from(groupMeetingAttendance)
        .innerJoin(user, eq(groupMeetingAttendance.userId, user.id))
        .where(
            inArray(
                groupMeetingAttendance.sessionId,
                sessions.map((session) => session.id),
            ),
        );
    const now = new Date();

    return sessions.map((session) => {
        const sessionAttendance = attendanceRows
            .filter((row) => row.sessionId === session.id)
            .map((row): MeetingAttendanceHistory => {
                const activeEnd =
                    row.activeJoinedAt && row.lastSeenAt
                        ? new Date(
                              Math.min(
                                  now.getTime(),
                                  session.scheduledEndsAt.getTime(),
                                  row.lastSeenAt.getTime() + ACTIVE_GRACE_MS,
                              ),
                          )
                        : null;
                const activeSeconds =
                    row.activeJoinedAt && activeEnd
                        ? Math.max(
                              0,
                              Math.floor(
                                  (activeEnd.getTime() -
                                      row.activeJoinedAt.getTime()) /
                                      1_000,
                              ),
                          )
                        : 0;

                return {
                    id: row.id,
                    userId: row.userId,
                    name: row.name,
                    joinedAt: row.joinedAt,
                    leftAt: row.leftAt ?? activeEnd ?? row.lastSeenAt,
                    durationSeconds: row.attendedSeconds + activeSeconds,
                    status: row.status as MeetingAttendanceHistory["status"],
                    excuse:
                        canReview || row.userId === requestingUserId
                            ? row.excuse
                            : null,
                };
            })
            .sort(
                (first, second) =>
                    (first.joinedAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
                    (second.joinedAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
            );
        const inferredEnd = session.startedAt
            ? sessionAttendance.reduce(
                  (latest, item) =>
                      item.leftAt && item.leftAt.getTime() > latest.getTime()
                          ? item.leftAt
                          : latest,
                  session.startedAt,
              )
            : null;
        const endedAt = session.endedAt ?? inferredEnd;

        return {
            id: session.id,
            cancelledAt: session.cancelledAt,
            scheduledStartsAt: session.scheduledStartsAt,
            startedAt: session.startedAt,
            endedAt,
            durationSeconds: Math.max(
                0,
                endedAt && session.startedAt
                    ? Math.floor(
                          (endedAt.getTime() - session.startedAt.getTime()) /
                              1_000,
                      )
                    : 0,
            ),
            participantCount: sessionAttendance.filter(
                (item) => item.status === "present",
            ).length,
            attendance: canReview
                ? sessionAttendance.filter(
                      (item) =>
                          !options.pendingOnly || item.status === "pending",
                  )
                : sessionAttendance.filter(
                      (item) => item.userId === requestingUserId,
                  ),
        };
    });
}
