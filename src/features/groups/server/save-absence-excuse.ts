"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const schema = z.object({
    groupId: z.string().min(1),
    attendanceId: z.string().min(1),
    excuse: z.string().trim().min(1).max(1000),
});

export default async function saveAbsenceExcuse(input: unknown) {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { success: false as const };
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };
    const { groupId, attendanceId, excuse } = parsed.data;
    const [row] = await db
        .select({ id: groupMeetingAttendance.id })
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
                eq(groupMember.userId, session.user.id),
            ),
        )
        .where(
            and(
                eq(groupMeetingAttendance.id, attendanceId),
                eq(groupMeetingAttendance.userId, session.user.id),
                eq(groupMeeting.groupId, groupId),
                isNotNull(groupMeetingSession.finalizedAt),
                isNull(groupMeetingSession.cancelledAt),
            ),
        )
        .limit(1);
    if (!row) return { success: false as const };
    // The conditional update also protects against a simultaneous final review.
    const updated = await db
        .update(groupMeetingAttendance)
        .set({ excuse })
        .where(
            and(
                eq(groupMeetingAttendance.id, attendanceId),
                eq(groupMeetingAttendance.userId, session.user.id),
                eq(groupMeetingAttendance.status, "pending"),
            ),
        )
        .returning({ id: groupMeetingAttendance.id });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/history`);
    return { success: updated.length > 0 };
}
