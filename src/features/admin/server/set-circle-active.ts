"use server";

import { and, eq, gt, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    adminActivity,
    groupMeeting,
    groupMeetingSchedule,
    groupMeetingSession,
    groupMember,
    memorizationGroup,
    practiceAssignment,
} from "@/drizzle/schema";
import { getPlatformAdmin } from "@/features/auth/permissions";
import { getUpcomingMeetingOccurrences } from "@/features/groups/server/meeting-schedule";

export default async function setCircleActive(input: unknown) {
    const parsed = z
        .object({ groupId: z.string().min(1), isActive: z.boolean() })
        .safeParse(input);
    const admin = await getPlatformAdmin();
    if (!admin || !parsed.success)
        return { success: false, reason: "unauthorized" };
    const { groupId, isActive } = parsed.data;
    const result = await db.transaction(async (tx) => {
        const [group] = await tx
            .select()
            .from(memorizationGroup)
            .where(eq(memorizationGroup.id, groupId))
            .for("update");
        if (!group) return { success: false, reason: "not_found" };
        if (group.isActive === isActive) return { success: true };
        const now = new Date();
        const [meeting] = await tx
            .select()
            .from(groupMeeting)
            .where(eq(groupMeeting.groupId, groupId))
            .for("update");
        if (meeting) {
            const live = await tx
                .select({ id: groupMeetingSession.id })
                .from(groupMeetingSession)
                .where(
                    and(
                        eq(groupMeetingSession.meetingId, meeting.id),
                        isNotNull(groupMeetingSession.startedAt),
                        isNull(groupMeetingSession.finalizedAt),
                        isNull(groupMeetingSession.endedAt),
                        gt(groupMeetingSession.scheduledEndsAt, now),
                    ),
                )
                .limit(1);
            if (
                live.length ||
                (meeting.hostActiveUntil && meeting.hostActiveUntil > now)
            )
                return { success: false, reason: "active_meeting" };
        }
        if (isActive) {
            const [supervisor] = await tx
                .select({ userId: groupMember.userId })
                .from(groupMember)
                .where(
                    and(
                        eq(groupMember.groupId, groupId),
                        eq(groupMember.role, "supervisor"),
                    ),
                );
            if (
                !supervisor ||
                !meeting ||
                meeting.hostUserId !== supervisor.userId
            )
                return { success: false, reason: "supervisor_required" };
            const schedule = await tx
                .select()
                .from(groupMeetingSchedule)
                .where(eq(groupMeetingSchedule.meetingId, meeting.id));
            const closed = await tx
                .select({ startsAt: groupMeetingSession.scheduledStartsAt })
                .from(groupMeetingSession)
                .where(
                    and(
                        eq(groupMeetingSession.meetingId, meeting.id),
                        isNotNull(groupMeetingSession.finalizedAt),
                    ),
                );
            const [next] = getUpcomingMeetingOccurrences({
                ...meeting,
                schedule,
                now,
                limit: 1,
                closedOccurrences: closed.map((row) =>
                    row.startsAt.toISOString(),
                ),
            });
            if (!next) return { success: false, reason: "schedule_required" };
            // Resume unfinished work at the next meeting, never at a date that
            // elapsed while the circle was inactive. Preserve progress/reviews.
            await tx
                .update(practiceAssignment)
                .set({ dueAt: new Date(next), updatedAt: now })
                .where(
                    and(
                        eq(practiceAssignment.groupId, groupId),
                        inArray(practiceAssignment.status, [
                            "draft",
                            "in_progress",
                            "submitted",
                            "needs_revision",
                            "not_completed",
                        ]),
                        or(
                            lt(practiceAssignment.dueAt, now),
                            isNull(practiceAssignment.dueAt),
                            closed.length
                                ? inArray(
                                      practiceAssignment.dueAt,
                                      closed.map((row) => row.startsAt),
                                  )
                                : undefined,
                        ),
                    ),
                );
        } else if (meeting) {
            // Prepared occurrences are cancelled without marking anyone absent.
            await tx
                .update(groupMeetingSession)
                .set({ cancelledAt: now, finalizedAt: now, endedAt: now })
                .where(
                    and(
                        eq(groupMeetingSession.meetingId, meeting.id),
                        isNull(groupMeetingSession.finalizedAt),
                    ),
                );
            await tx
                .update(groupMeeting)
                .set({
                    roomName: `circle-${crypto.randomUUID()}`,
                    hostActiveUntil: null,
                    updatedAt: now,
                })
                .where(eq(groupMeeting.id, meeting.id));
        }
        await tx
            .update(memorizationGroup)
            .set({
                isActive,
                ...(isActive ? { activeSince: now } : {}),
                updatedAt: now,
            })
            .where(eq(memorizationGroup.id, groupId));
        await tx.insert(adminActivity).values({
            id: crypto.randomUUID(),
            actorId: admin.id,
            groupId,
            groupName: group.name,
            action: isActive ? "circle_activated" : "circle_deactivated",
            details: {},
        });
        return { success: true };
    });
    if (result.success) {
        for (const path of [
            "/admin",
            "/groups",
            "/dashboard",
            "/assignments",
            "/practice",
        ])
            revalidatePath(path);
        revalidatePath(`/groups/${groupId}`, "layout");
    }
    return result;
}
