import "server-only";

import {
    and,
    count,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    sql,
} from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
    practiceAssignment,
    user,
} from "@/drizzle/schema";
import type { PracticeKind } from "@/features/practice/types";
import { finalizeEndedMeetingAttendance } from "./meeting-attendance";

export type GroupActivityItem =
    | {
          id: string;
          type: "assignment" | "submission";
          occurredAt: Date;
          assignmentId: string;
          memberId: string;
          memberName: string;
          kind: PracticeKind;
      }
    | {
          id: string;
          type: "meeting";
          occurredAt: Date;
          meetingSessionId: string;
          participantCount: number;
      };

export default async function getGroupActivity(
    groupId: string,
    requestingUserId: string,
    isAdmin: boolean,
    limit = 8,
): Promise<GroupActivityItem[]> {
    const [membership] = await db
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, requestingUserId),
            ),
        )
        .limit(1);
    if (!membership) return [];

    await finalizeEndedMeetingAttendance();

    const assignmentConditions = [eq(practiceAssignment.groupId, groupId)];
    if (!isAdmin) {
        assignmentConditions.push(
            eq(practiceAssignment.assigneeId, requestingUserId),
        );
    }

    const [assignments, meetingSessions] = await Promise.all([
        db
            .select({
                id: practiceAssignment.id,
                assigneeId: practiceAssignment.assigneeId,
                assigneeName: user.name,
                kind: practiceAssignment.kind,
                createdAt: practiceAssignment.createdAt,
                submittedAt: practiceAssignment.submittedAt,
            })
            .from(practiceAssignment)
            .innerJoin(user, eq(practiceAssignment.assigneeId, user.id))
            .where(and(...assignmentConditions))
            .orderBy(
                desc(
                    sql`greatest(${practiceAssignment.createdAt}, coalesce(${practiceAssignment.submittedAt}, ${practiceAssignment.createdAt}))`,
                ),
            )
            .limit(limit * 2),
        db
            .select({
                id: groupMeetingSession.id,
                finalizedAt: groupMeetingSession.finalizedAt,
                scheduledEndsAt: groupMeetingSession.scheduledEndsAt,
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
                    isNull(groupMeetingSession.cancelledAt),
                ),
            )
            .orderBy(desc(groupMeetingSession.finalizedAt))
            .limit(limit),
    ]);

    const participantCounts = new Map<string, number>();
    if (meetingSessions.length > 0) {
        const rows = await db
            .select({
                sessionId: groupMeetingAttendance.sessionId,
                value: count(groupMeetingAttendance.id),
            })
            .from(groupMeetingAttendance)
            .where(
                and(
                    inArray(
                        groupMeetingAttendance.sessionId,
                        meetingSessions.map((session) => session.id),
                    ),
                    eq(groupMeetingAttendance.status, "present"),
                ),
            )
            .groupBy(groupMeetingAttendance.sessionId);
        for (const row of rows) participantCounts.set(row.sessionId, row.value);
    }

    const activities: GroupActivityItem[] = [];
    for (const assignment of assignments) {
        activities.push({
            id: `${assignment.id}:assignment`,
            type: "assignment",
            occurredAt: assignment.createdAt,
            assignmentId: assignment.id,
            memberId: assignment.assigneeId,
            memberName: assignment.assigneeName,
            kind: assignment.kind as PracticeKind,
        });
        if (assignment.submittedAt) {
            activities.push({
                id: `${assignment.id}:submission`,
                type: "submission",
                occurredAt: assignment.submittedAt,
                assignmentId: assignment.id,
                memberId: assignment.assigneeId,
                memberName: assignment.assigneeName,
                kind: assignment.kind as PracticeKind,
            });
        }
    }
    for (const meetingSession of meetingSessions) {
        if (!meetingSession.finalizedAt) continue;
        activities.push({
            id: `${meetingSession.id}:meeting`,
            type: "meeting",
            occurredAt: meetingSession.scheduledEndsAt,
            meetingSessionId: meetingSession.id,
            participantCount: participantCounts.get(meetingSession.id) ?? 0,
        });
    }

    return activities
        .sort(
            (first, second) =>
                second.occurredAt.getTime() - first.occurredAt.getTime(),
        )
        .slice(0, Math.max(1, limit));
}
