"use server";

import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
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

const inputSchema = z.object({
    groupId: z.string().min(1),
    attendanceId: z.string().min(1),
    decision: z.enum(["accepted", "unaccepted"]),
});

export default async function reviewMeetingAbsence(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const, reason: "unauthorized" };

    const [admin] = await db
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, parsed.data.groupId),
                eq(groupMember.userId, session.user.id),
                eq(groupMember.role, "supervisor"),
            ),
        )
        .limit(1);
    if (!admin) return { success: false as const, reason: "unauthorized" };

    const result = await db.transaction(async (transaction) => {
        const [absence] = await transaction
            .select({
                userId: groupMeetingAttendance.userId,
                status: groupMeetingAttendance.status,
                role: groupMember.role,
                membershipStartedAt: groupMember.createdAt,
                hostUserId: groupMeeting.hostUserId,
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
            .leftJoin(
                groupMember,
                and(
                    eq(groupMember.groupId, groupMeeting.groupId),
                    eq(groupMember.userId, groupMeetingAttendance.userId),
                ),
            )
            .where(
                and(
                    eq(groupMeetingAttendance.id, parsed.data.attendanceId),
                    eq(groupMeeting.groupId, parsed.data.groupId),
                    isNotNull(groupMeetingSession.finalizedAt),
                ),
            )
            .limit(1);
        if (!absence || absence.status === "present") {
            return { success: false as const, reason: "not_found" };
        }

        await transaction
            .update(groupMeetingAttendance)
            .set({ status: parsed.data.decision })
            .where(eq(groupMeetingAttendance.id, parsed.data.attendanceId));

        const recentAttendance = await transaction
            .select({ status: groupMeetingAttendance.status })
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
                    eq(groupMeeting.groupId, parsed.data.groupId),
                    eq(groupMeetingAttendance.userId, absence.userId),
                    isNotNull(groupMeetingSession.finalizedAt),
                    ...(absence.membershipStartedAt
                        ? [
                              gte(
                                  groupMeetingSession.scheduledStartsAt,
                                  absence.membershipStartedAt,
                              ),
                          ]
                        : []),
                ),
            )
            .orderBy(desc(groupMeetingSession.scheduledStartsAt));

        let consecutiveUnaccepted = 0;
        for (const attendance of recentAttendance) {
            if (attendance.status !== "unaccepted") break;
            consecutiveUnaccepted += 1;
        }

        const canRemove =
            consecutiveUnaccepted >= 3 &&
            absence.role === "member" &&
            absence.hostUserId !== absence.userId;
        if (canRemove) {
            await transaction
                .delete(groupMember)
                .where(
                    and(
                        eq(groupMember.groupId, parsed.data.groupId),
                        eq(groupMember.userId, absence.userId),
                        eq(groupMember.role, "member"),
                    ),
                );
        }

        return {
            success: true as const,
            consecutiveUnaccepted,
            removed: canRemove,
        };
    });

    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return result;
}
