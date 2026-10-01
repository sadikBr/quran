"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingSession,
    groupMember,
    memorizationGroup,
    practiceAssignment,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { getGroupMeetingForUser } from "./get-group-meeting";
import {
    calculateMeetingState,
    getUpcomingMeetingOccurrences,
} from "./meeting-schedule";

const schema = z.object({
    groupId: z.string().min(1),
    from: z.iso.datetime(),
    to: z.iso.datetime(),
});
export default async function rescheduleMeeting(input: unknown) {
    const parsed = schema.safeParse(input);
    const session = await auth.api.getSession({ headers: await headers() });
    if (!parsed.success || !session) return { success: false };
    const { groupId, from, to } = parsed.data;
    const result = await db.transaction(async (tx) => {
        await tx
            .select({ id: memorizationGroup.id })
            .from(memorizationGroup)
            .where(eq(memorizationGroup.id, groupId))
            .for("update");
        const [member] = await tx
            .select({ id: groupMember.id })
            .from(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, groupId),
                    eq(groupMember.userId, session.user.id),
                    eq(groupMember.role, "supervisor"),
                ),
            );
        if (!member) return { success: false };
        const meeting = await getGroupMeetingForUser(
            groupId,
            session.user.id,
            tx,
        );
        const now = new Date();
        if (
            !meeting ||
            calculateMeetingState(meeting).status === "active" ||
            calculateMeetingState(meeting).nextStartsAt !== from ||
            new Date(from) <= now ||
            new Date(to) <= now ||
            Math.abs(new Date(to).getTime() - now.getTime()) > 90 * 86400000 ||
            from === to
        )
            return { success: false };
        const occurrences = getUpcomingMeetingOccurrences({
            ...meeting,
            now,
            limit: 200,
        });
        if (
            occurrences.some(
                (date) =>
                    date !== from &&
                    Math.abs(
                        new Date(date).getTime() - new Date(to).getTime(),
                    ) <
                        meeting.activeWindowMinutes * 60000,
            )
        )
            return { success: false };
        const [oldSession] = await tx
            .select()
            .from(groupMeetingSession)
            .where(
                and(
                    eq(groupMeetingSession.meetingId, meeting.id),
                    eq(groupMeetingSession.scheduledStartsAt, new Date(from)),
                ),
            )
            .for("update");
        if (
            oldSession?.startedAt ||
            oldSession?.finalizedAt ||
            new Date(from).getTime() <= Date.now() ||
            new Date(to).getTime() <= Date.now()
        )
            return { success: false };
        const changes = [...(meeting.rescheduledOccurrences ?? [])];
        const prior = changes.find((change) => change.to === from);
        if (prior) prior.to = to;
        else changes.push({ from, to });
        await tx
            .update(groupMeeting)
            .set({ rescheduledOccurrences: changes, updatedAt: now })
            .where(eq(groupMeeting.id, meeting.id));
        if (oldSession)
            await tx
                .update(groupMeetingSession)
                .set({
                    scheduledStartsAt: new Date(to),
                    scheduledEndsAt: new Date(
                        new Date(to).getTime() +
                            meeting.activeWindowMinutes * 60000,
                    ),
                })
                .where(eq(groupMeetingSession.id, oldSession.id));
        await tx
            .update(practiceAssignment)
            .set({ dueAt: new Date(to), updatedAt: now })
            .where(
                and(
                    eq(practiceAssignment.groupId, groupId),
                    eq(practiceAssignment.dueAt, new Date(from)),
                    inArray(practiceAssignment.status, [
                        "draft",
                        "in_progress",
                        "submitted",
                        "needs_revision",
                        "not_completed",
                    ]),
                ),
            );
        return { success: true };
    });
    for (const path of [
        `/groups/${groupId}`,
        `/groups/${groupId}/plan`,
        "/groups",
        "/assignments",
        "/practice",
        "/dashboard",
    ])
        revalidatePath(path);
    return result;
}
