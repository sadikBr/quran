"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
    groupMember,
    memorizationGroup,
    practiceAssignment,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { expireUnsubmittedAssignments } from "./expire-unsubmitted-assignments";
import { getGroupMeetingForUser } from "./get-group-meeting";
import { ensureMeetingAttendanceRoster } from "./meeting-attendance";
import { calculateMeetingState } from "./meeting-schedule";
import { getRevisionMeetingDate } from "./revision-meeting";

export default async function endGroupMeeting(
    groupId: string,
    occurrence: string,
    mode: "end" | "cancel" = "end",
) {
    if (mode !== "end" && mode !== "cancel") return { success: false };
    const user = await auth.api.getSession({ headers: await headers() });
    if (!user) return { success: false };
    const [supervisor] = await db
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, user.user.id),
                eq(groupMember.role, "supervisor"),
            ),
        )
        .limit(1);
    if (!supervisor) return { success: false };
    const meeting = await getGroupMeetingForUser(groupId, user.user.id);
    if (!meeting) return { success: false };
    const state = calculateMeetingState(meeting);
    if (
        state.status !== "active" ||
        state.activeStartsAt !== occurrence ||
        !state.activeEndsAt
    )
        return { success: false };
    const next =
        mode === "cancel"
            ? getRevisionMeetingDate(meeting, new Date(occurrence))
            : null;
    if (mode === "cancel" && !next)
        return { success: false, reason: "no_next_meeting" };
    const id = await ensureMeetingAttendanceRoster({
        meetingId: meeting.id,
        groupId,
        scheduledStartsAt: new Date(occurrence),
        scheduledEndsAt: new Date(state.activeEndsAt),
    });
    if (!id) return { success: false };
    const now = new Date();
    const didClose = await db.transaction(async (tx) => {
        // Share the activation lock order before touching the session or room.
        const [group] = await tx
            .select()
            .from(memorizationGroup)
            .where(eq(memorizationGroup.id, groupId))
            .for("update");
        if (
            !group?.isActive ||
            (group.activeSince && new Date(occurrence) < group.activeSince)
        )
            return false;
        const closed = await tx
            .update(groupMeetingSession)
            .set({
                endedAt: now,
                scheduledEndsAt: now,
                finalizedAt: now,
                cancelledAt: mode === "cancel" ? now : null,
            })
            .where(
                and(
                    eq(groupMeetingSession.id, id),
                    isNull(groupMeetingSession.finalizedAt),
                ),
            )
            .returning({ id: groupMeetingSession.id });
        if (!closed.length) return false;
        if (mode === "cancel" && next) {
            await tx
                .update(practiceAssignment)
                .set({ dueAt: next, updatedAt: now })
                .where(
                    and(
                        eq(practiceAssignment.groupId, groupId),
                        eq(practiceAssignment.dueAt, new Date(occurrence)),
                    ),
                );
        }
        await tx
            .update(groupMeetingAttendance)
            .set({
                status:
                    mode === "cancel"
                        ? sql`${groupMeetingAttendance.status}`
                        : sql`case when ${groupMeetingAttendance.status} = 'expected' then 'pending' else ${groupMeetingAttendance.status} end`,
                attendedSeconds: sql`${groupMeetingAttendance.attendedSeconds} + case when ${groupMeetingAttendance.activeJoinedAt} is null then 0 else greatest(0, floor(extract(epoch from (${now.toISOString()}::timestamptz - ${groupMeetingAttendance.activeJoinedAt}))))::int end`,
                activeJoinedAt: null,
                leftAt: now,
            })
            .where(eq(groupMeetingAttendance.sessionId, id));
        await tx
            .update(groupMeeting)
            .set({ hostActiveUntil: null })
            .where(eq(groupMeeting.id, meeting.id));
        return true;
    });
    // The cron also picks up finalized sessions, so interrupted processing retries.
    if (!didClose) return { success: false };
    const result =
        mode === "end"
            ? await expireUnsubmittedAssignments(now, groupId)
            : { failed: 0 };
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/assignments");
    revalidatePath("/dashboard");
    revalidatePath("/practice");
    return { success: true, failed: result.failed };
}
