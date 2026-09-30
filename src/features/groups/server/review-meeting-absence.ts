"use server";

import { and, desc, eq, gte, isNotNull, isNull } from "drizzle-orm";
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
    confirmRemoval: z.boolean().default(false),
    expectedExcuse: z.string().max(1000).nullable(),
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
                excuse: groupMeetingAttendance.excuse,
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
                    isNull(groupMeetingSession.cancelledAt),
                ),
            )
            .limit(1)
            .for("update", { of: groupMeetingAttendance });
        if (!absence || absence.status === "present") {
            return { success: false as const, reason: "not_found" };
        }
        if (absence.status !== "pending") {
            return { success: false as const, reason: "already_reviewed" };
        }
        if (absence.excuse !== parsed.data.expectedExcuse) {
            return { success: false as const, reason: "excuse_changed" };
        }

        const recentAttendance = await transaction
            .select({
                id: groupMeetingAttendance.id,
                status: groupMeetingAttendance.status,
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
                    eq(groupMeeting.groupId, parsed.data.groupId),
                    eq(groupMeetingAttendance.userId, absence.userId),
                    isNotNull(groupMeetingSession.finalizedAt),
                    isNull(groupMeetingSession.cancelledAt),
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
            const status =
                attendance.id === parsed.data.attendanceId
                    ? parsed.data.decision
                    : attendance.status;
            if (status !== "unaccepted") break;
            consecutiveUnaccepted += 1;
        }

        const canRemove =
            consecutiveUnaccepted >= 3 &&
            absence.role === "member" &&
            absence.hostUserId !== absence.userId;
        if (canRemove && !parsed.data.confirmRemoval) {
            return { success: false as const, reason: "removal_confirmation" };
        }

        const updated = await transaction
            .update(groupMeetingAttendance)
            .set({ status: parsed.data.decision })
            .where(
                and(
                    eq(groupMeetingAttendance.id, parsed.data.attendanceId),
                    eq(groupMeetingAttendance.status, "pending"),
                ),
            )
            .returning({ id: groupMeetingAttendance.id });
        // Only one request may finalize a pending absence, including when two
        // tabs submit different decisions at the same time.
        if (updated.length === 0) {
            return { success: false as const, reason: "already_reviewed" };
        }

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
    revalidatePath(`/groups/${parsed.data.groupId}/history`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return result;
}
