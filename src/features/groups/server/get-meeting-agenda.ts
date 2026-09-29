import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
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

export interface MeetingAgendaAssignment {
    id: string;
    kind: PracticeKind;
    status: "in_progress" | "submitted" | "completed" | "needs_revision";
    startSurahNumber: number;
    startAyahNumber: number;
    endSurahNumber: number;
    endAyahNumber: number;
}

export interface MeetingAgendaMember {
    userId: string;
    name: string;
    image: string | null;
    role: "supervisor" | "member";
    attendance: "present" | "waiting" | "not_started";
    queuePosition: number | null;
    assignments: MeetingAgendaAssignment[];
}

export interface MeetingAgendaData {
    occurrenceStartsAt: Date;
    active: boolean;
    readyCount: number;
    presentCount: number;
    assignmentCount: number;
    members: MeetingAgendaMember[];
}

export default async function getMeetingAgenda({
    groupId,
    requestingUserId,
    occurrenceStartsAt,
    active,
}: {
    groupId: string;
    requestingUserId: string;
    occurrenceStartsAt: Date | null;
    active: boolean;
}): Promise<MeetingAgendaData | null> {
    if (!occurrenceStartsAt) return null;

    const [requestingMembership] = await db
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, requestingUserId),
            ),
        )
        .limit(1);
    if (!requestingMembership) return null;

    const members = await db
        .select({
            userId: groupMember.userId,
            name: user.name,
            image: user.image,
            role: groupMember.role,
        })
        .from(groupMember)
        .innerJoin(user, eq(groupMember.userId, user.id))
        .where(eq(groupMember.groupId, groupId))
        .orderBy(asc(user.name));
    if (members.length === 0) return null;

    const assignments = await db
        .select({
            id: practiceAssignment.id,
            assigneeId: practiceAssignment.assigneeId,
            kind: practiceAssignment.kind,
            status: practiceAssignment.status,
            startSurahNumber: practiceAssignment.startSurahNumber,
            startAyahNumber: practiceAssignment.startAyahNumber,
            endSurahNumber: practiceAssignment.endSurahNumber,
            endAyahNumber: practiceAssignment.endAyahNumber,
        })
        .from(practiceAssignment)
        .where(
            and(
                eq(practiceAssignment.groupId, groupId),
                eq(practiceAssignment.dueAt, occurrenceStartsAt),
                inArray(practiceAssignment.status, [
                    "in_progress",
                    "submitted",
                    "completed",
                    "needs_revision",
                ]),
            ),
        );

    const [meetingSession] = await db
        .select({ id: groupMeetingSession.id })
        .from(groupMeetingSession)
        .innerJoin(
            groupMeeting,
            eq(groupMeetingSession.meetingId, groupMeeting.id),
        )
        .where(
            and(
                eq(groupMeeting.groupId, groupId),
                eq(groupMeetingSession.scheduledStartsAt, occurrenceStartsAt),
            ),
        )
        .limit(1);
    const attendance = meetingSession
        ? await db
              .select({
                  userId: groupMeetingAttendance.userId,
                  status: groupMeetingAttendance.status,
              })
              .from(groupMeetingAttendance)
              .where(eq(groupMeetingAttendance.sessionId, meetingSession.id))
        : [];

    const preparedMembers: MeetingAgendaMember[] = members.map((member) => {
        const memberAssignments = assignments
            .filter((assignment) => assignment.assigneeId === member.userId)
            .map(
                (assignment): MeetingAgendaAssignment => ({
                    id: assignment.id,
                    kind: assignment.kind as PracticeKind,
                    status: assignment.status as MeetingAgendaAssignment["status"],
                    startSurahNumber: assignment.startSurahNumber,
                    startAyahNumber: assignment.startAyahNumber,
                    endSurahNumber: assignment.endSurahNumber,
                    endAyahNumber: assignment.endAyahNumber,
                }),
            );
        const attendanceStatus = attendance.find(
            (entry) => entry.userId === member.userId,
        )?.status;

        return {
            userId: member.userId,
            name: member.name,
            image: member.image,
            role: member.role as MeetingAgendaMember["role"],
            attendance: !active
                ? ("not_started" as const)
                : attendanceStatus === "present"
                  ? ("present" as const)
                  : ("waiting" as const),
            queuePosition: null as number | null,
            assignments: memberAssignments,
        };
    });

    preparedMembers.sort((first, second) => {
        const priority = (member: (typeof preparedMembers)[number]) => {
            if (
                member.assignments.some(
                    (assignment) => assignment.status === "submitted",
                )
            ) {
                return member.attendance === "present" ? 4 : 3;
            }
            if (member.assignments.length > 0) return 2;
            return 1;
        };

        return (
            priority(second) - priority(first) ||
            first.name.localeCompare(second.name)
        );
    });

    let queuePosition = 0;
    for (const member of preparedMembers) {
        if (
            member.assignments.some(
                (assignment) => assignment.status === "submitted",
            )
        ) {
            queuePosition += 1;
            member.queuePosition = queuePosition;
        }
    }

    return {
        occurrenceStartsAt,
        active,
        readyCount: preparedMembers.filter((member) =>
            member.assignments.some(
                (assignment) => assignment.status === "submitted",
            ),
        ).length,
        presentCount: preparedMembers.filter(
            (member) => member.attendance === "present",
        ).length,
        assignmentCount: assignments.length,
        members: preparedMembers,
    };
}
