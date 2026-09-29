import "server-only";

import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
    practiceAssignment,
} from "@/drizzle/schema";

export interface MemberProgressSummary {
    userId: string;
    activeAssignments: number;
    completedAssignments: number;
    awaitingReview: number;
    totalAssignments: number;
    assignmentCompletionRate: number | null;
    attendedMeetings: number;
    countedMeetings: number;
    attendanceRate: number | null;
    excusedAbsences: number;
    unacceptedAbsenceStreak: number;
}

export default async function getMemberProgressSummaries(
    groupId: string,
    requestingUserId: string,
): Promise<MemberProgressSummary[]> {
    const [requestingMembership] = await db
        .select({ role: groupMember.role })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, requestingUserId),
            ),
        )
        .limit(1);
    if (!requestingMembership) return [];

    const memberships = await db
        .select({
            userId: groupMember.userId,
            joinedAt: groupMember.createdAt,
        })
        .from(groupMember)
        .where(
            requestingMembership.role === "admin"
                ? eq(groupMember.groupId, groupId)
                : and(
                      eq(groupMember.groupId, groupId),
                      eq(groupMember.userId, requestingUserId),
                  ),
        );
    if (memberships.length === 0) return [];

    const userIds = memberships.map((membership) => membership.userId);
    const [assignmentRows, attendanceRows] = await Promise.all([
        db
            .select({
                userId: practiceAssignment.assigneeId,
                status: practiceAssignment.status,
            })
            .from(practiceAssignment)
            .where(
                and(
                    eq(practiceAssignment.groupId, groupId),
                    inArray(practiceAssignment.assigneeId, userIds),
                    inArray(practiceAssignment.status, [
                        "in_progress",
                        "submitted",
                        "needs_revision",
                        "completed",
                    ]),
                ),
            ),
        db
            .select({
                userId: groupMeetingAttendance.userId,
                status: groupMeetingAttendance.status,
                scheduledStartsAt: groupMeetingSession.scheduledStartsAt,
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
            .where(
                and(
                    eq(groupMeeting.groupId, groupId),
                    isNotNull(groupMeetingSession.finalizedAt),
                    inArray(groupMeetingAttendance.userId, userIds),
                ),
            )
            .orderBy(desc(groupMeetingSession.scheduledStartsAt)),
    ]);

    return memberships.map((membership) => {
        const memberAssignments = assignmentRows.filter(
            (assignment) => assignment.userId === membership.userId,
        );
        const completedAssignments = memberAssignments.filter(
            (assignment) => assignment.status === "completed",
        ).length;
        const activeAssignments =
            memberAssignments.length - completedAssignments;
        const awaitingReview = memberAssignments.filter(
            (assignment) => assignment.status === "submitted",
        ).length;
        const memberAttendance = attendanceRows.filter(
            (attendance) =>
                attendance.userId === membership.userId &&
                attendance.scheduledStartsAt >= membership.joinedAt,
        );
        const attendedMeetings = memberAttendance.filter(
            (attendance) => attendance.status === "present",
        ).length;
        const unacceptedAbsences = memberAttendance.filter(
            (attendance) => attendance.status === "unaccepted",
        ).length;
        const countedMeetings = attendedMeetings + unacceptedAbsences;
        let unacceptedAbsenceStreak = 0;
        for (const attendance of memberAttendance) {
            if (attendance.status !== "unaccepted") break;
            unacceptedAbsenceStreak += 1;
        }

        return {
            userId: membership.userId,
            activeAssignments,
            completedAssignments,
            awaitingReview,
            totalAssignments: memberAssignments.length,
            assignmentCompletionRate:
                memberAssignments.length > 0
                    ? Math.round(
                          (completedAssignments / memberAssignments.length) *
                              100,
                      )
                    : null,
            attendedMeetings,
            countedMeetings,
            attendanceRate:
                countedMeetings > 0
                    ? Math.round((attendedMeetings / countedMeetings) * 100)
                    : null,
            excusedAbsences: memberAttendance.filter(
                (attendance) => attendance.status === "accepted",
            ).length,
            unacceptedAbsenceStreak,
        };
    });
}
