import "server-only";

import { and, eq, isNull, lte } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
} from "@/drizzle/schema";

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
        .select({ id: groupMeetingSession.id })
        .from(groupMeetingSession)
        .where(
            and(
                lte(groupMeetingSession.scheduledEndsAt, now),
                isNull(groupMeetingSession.finalizedAt),
            ),
        );

    for (const meetingSession of endedSessions) {
        await db.transaction(async (transaction) => {
            await transaction
                .update(groupMeetingAttendance)
                .set({ status: "pending" })
                .where(
                    and(
                        eq(groupMeetingAttendance.sessionId, meetingSession.id),
                        eq(groupMeetingAttendance.status, "expected"),
                    ),
                );
            await transaction
                .update(groupMeetingSession)
                .set({ finalizedAt: now })
                .where(eq(groupMeetingSession.id, meetingSession.id));
        });
    }

    return endedSessions.length;
}
