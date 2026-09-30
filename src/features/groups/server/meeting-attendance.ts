import "server-only";

import { and, eq, isNull, lte } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
    practiceAssignment,
} from "@/drizzle/schema";
import { getGroupMeetingForUser } from "./get-group-meeting";
import { getRevisionMeetingDate } from "./revision-meeting";

export async function ensureMeetingAttendanceRoster({
    meetingId,
    groupId,
    scheduledStartsAt,
    scheduledEndsAt,
}: {
    meetingId: string;
    groupId: string;
    scheduledStartsAt: Date;
    scheduledEndsAt: Date;
}) {
    return db.transaction(async (transaction) => {
        const insertedSessions = await transaction
            .insert(groupMeetingSession)
            .values({
                id: crypto.randomUUID(),
                meetingId,
                scheduledStartsAt,
                scheduledEndsAt,
            })
            .onConflictDoNothing({
                target: [
                    groupMeetingSession.meetingId,
                    groupMeetingSession.scheduledStartsAt,
                ],
            })
            .returning({ id: groupMeetingSession.id });

        const [meetingSession] =
            insertedSessions.length > 0
                ? insertedSessions
                : await transaction
                      .select({ id: groupMeetingSession.id })
                      .from(groupMeetingSession)
                      .where(
                          and(
                              eq(groupMeetingSession.meetingId, meetingId),
                              eq(
                                  groupMeetingSession.scheduledStartsAt,
                                  scheduledStartsAt,
                              ),
                          ),
                      )
                      .limit(1);
        if (!meetingSession) return null;

        if (insertedSessions.length === 0) return meetingSession.id;

        const members = await transaction
            .select({ userId: groupMember.userId })
            .from(groupMember)
            .where(eq(groupMember.groupId, groupId));

        if (members.length > 0) {
            await transaction
                .insert(groupMeetingAttendance)
                .values(
                    members.map((member) => ({
                        id: crypto.randomUUID(),
                        sessionId: meetingSession.id,
                        userId: member.userId,
                        status: "expected",
                    })),
                )
                .onConflictDoNothing({
                    target: [
                        groupMeetingAttendance.sessionId,
                        groupMeetingAttendance.userId,
                    ],
                });
        }

        return meetingSession.id;
    });
}

export async function finalizeEndedMeetingAttendance(now = new Date()) {
    const endedSessions = await db
        .select({
            id: groupMeetingSession.id,
            groupId: groupMeeting.groupId,
            hostUserId: groupMeeting.hostUserId,
        })
        .from(groupMeetingSession)
        .innerJoin(
            groupMeeting,
            eq(groupMeeting.id, groupMeetingSession.meetingId),
        )
        .where(
            and(
                lte(groupMeetingSession.scheduledEndsAt, now),
                isNull(groupMeetingSession.finalizedAt),
            ),
        );

    for (const meetingSession of endedSessions) {
        const meeting = meetingSession.hostUserId
            ? await getGroupMeetingForUser(
                  meetingSession.groupId,
                  meetingSession.hostUserId,
              )
            : null;
        await db.transaction(async (transaction) => {
            // Serialize against presence updates and manual closure.
            const [current] = await transaction
                .select()
                .from(groupMeetingSession)
                .where(eq(groupMeetingSession.id, meetingSession.id))
                .for("update");
            if (!current || current.finalizedAt) return;
            const [host] = meetingSession.hostUserId
                ? await transaction
                      .select({ joinedAt: groupMeetingAttendance.joinedAt })
                      .from(groupMeetingAttendance)
                      .where(
                          and(
                              eq(groupMeetingAttendance.sessionId, current.id),
                              eq(
                                  groupMeetingAttendance.userId,
                                  meetingSession.hostUserId,
                              ),
                          ),
                      )
                : [];
            const cancelled = !host?.joinedAt;
            if (cancelled) {
                const next = getRevisionMeetingDate(
                    meeting,
                    current.scheduledStartsAt,
                    now,
                );
                // No future schedule: preserve the work and its date, but still
                // cancel the occurrence so it cannot penalize members.
                if (next)
                    await transaction
                        .update(practiceAssignment)
                        .set({ dueAt: next, updatedAt: now })
                        .where(
                            and(
                                eq(
                                    practiceAssignment.groupId,
                                    meetingSession.groupId,
                                ),
                                eq(
                                    practiceAssignment.dueAt,
                                    current.scheduledStartsAt,
                                ),
                            ),
                        );
            }
            if (!cancelled) {
                await transaction
                    .update(groupMeetingAttendance)
                    .set({ status: "pending" })
                    .where(
                        and(
                            eq(
                                groupMeetingAttendance.sessionId,
                                meetingSession.id,
                            ),
                            eq(groupMeetingAttendance.status, "expected"),
                        ),
                    );
            }
            await transaction
                .update(groupMeetingSession)
                .set({
                    finalizedAt: now,
                    endedAt: current.scheduledEndsAt,
                    cancelledAt: cancelled ? now : null,
                })
                .where(eq(groupMeetingSession.id, meetingSession.id));
        });
    }

    return endedSessions.length;
}
