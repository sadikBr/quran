import "server-only";

import { and, eq, inArray, isNotNull, isNull, lt, lte, or } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingSession,
    practiceAssignment,
} from "@/drizzle/schema";
import { sendAssignmentNotification } from "@/features/notifications/server/assignment-notifications";
import { getGroupMeetingForUser } from "./get-group-meeting";
import {
    ensureMeetingAttendanceRoster,
    finalizeEndedMeetingAttendance,
} from "./meeting-attendance";
import { getRevisionMeetingDate } from "./revision-meeting";

// Only unsubmitted work is eligible; pending supervisor reviews never expire.
export async function expireUnsubmittedAssignments(
    now: Date,
    groupId?: string,
) {
    // Recover occurrences even if the meeting reminder job missed their window.
    // Finalize/cancel them before considering any assignment penalties.
    const overdue = await db
        .selectDistinct({
            meetingId: groupMeeting.id,
            groupId: groupMeeting.groupId,
            dueAt: practiceAssignment.dueAt,
            windowMinutes: groupMeeting.activeWindowMinutes,
        })
        .from(practiceAssignment)
        .innerJoin(
            groupMeeting,
            eq(groupMeeting.groupId, practiceAssignment.groupId),
        )
        .where(
            and(
                lte(practiceAssignment.dueAt, now),
                inArray(practiceAssignment.status, [
                    "in_progress",
                    "submitted",
                    "needs_revision",
                    "not_completed",
                ]),
                groupId ? eq(practiceAssignment.groupId, groupId) : undefined,
            ),
        );
    for (const row of overdue) {
        if (!row.dueAt) continue;
        const endsAt = new Date(
            row.dueAt.getTime() + row.windowMinutes * 60_000,
        );
        if (endsAt > now) continue;
        await ensureMeetingAttendanceRoster({
            meetingId: row.meetingId,
            groupId: row.groupId,
            scheduledStartsAt: row.dueAt,
            scheduledEndsAt: endsAt,
        });
    }
    await finalizeEndedMeetingAttendance(now);
    const eligible = and(
        inArray(practiceAssignment.status, [
            "in_progress",
            "needs_revision",
            "not_completed",
        ]),
        inArray(
            practiceAssignment.id,
            db
                .select({ id: practiceAssignment.id })
                .from(practiceAssignment)
                .innerJoin(
                    groupMeeting,
                    eq(groupMeeting.groupId, practiceAssignment.groupId),
                )
                .innerJoin(
                    groupMeetingSession,
                    and(
                        eq(groupMeetingSession.meetingId, groupMeeting.id),
                        eq(
                            groupMeetingSession.scheduledStartsAt,
                            practiceAssignment.dueAt,
                        ),
                    ),
                )
                .where(
                    and(
                        isNotNull(groupMeetingSession.finalizedAt),
                        isNull(groupMeetingSession.cancelledAt),
                    ),
                ),
        ),
        // Makes repeated jobs safe when there is no next meeting to move to.
        or(
            isNull(practiceAssignment.reviewedAt),
            lt(practiceAssignment.reviewedAt, practiceAssignment.dueAt),
        ),
    );
    const rows = await db
        .select({
            id: practiceAssignment.id,
            groupId: groupMeeting.groupId,
            hostUserId: groupMeeting.hostUserId,
            dueAt: practiceAssignment.dueAt,
        })
        .from(practiceAssignment)
        .innerJoin(
            groupMeeting,
            eq(groupMeeting.groupId, practiceAssignment.groupId),
        )
        .where(
            and(
                eligible,
                groupId ? eq(practiceAssignment.groupId, groupId) : undefined,
            ),
        );
    let expired = 0;
    let withoutNextMeeting = 0;
    let failed = 0;
    for (const row of rows) {
        if (!row.dueAt) continue;
        try {
            const meeting = row.hostUserId
                ? await getGroupMeetingForUser(row.groupId, row.hostUserId)
                : null;
            const next = getRevisionMeetingDate(meeting, row.dueAt, now);
            const updated = await db
                .update(practiceAssignment)
                .set({
                    status: "not_completed",
                    dueAt: next ?? row.dueAt,
                    reviewedAt: now,
                    submittedAt: null,
                    progressSurahNumber: null,
                    progressAyahNumber: null,
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(practiceAssignment.id, row.id),
                        eq(practiceAssignment.dueAt, row.dueAt),
                        eligible,
                    ),
                )
                .returning({ id: practiceAssignment.id });
            // Recheck at update time: submission or another cron may have won.
            if (!updated.length) continue;
            expired++;
            if (!next) withoutNextMeeting++;
            await sendAssignmentNotification(row.id, "review_not_completed");
        } catch {
            failed++;
        }
    }
    return { expired, withoutNextMeeting, failed };
}
