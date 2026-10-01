"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    groupMember,
    memorizationGroup,
    practiceAssignment,
    userSettings,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import { getUpcomingMeetingOccurrences } from "@/features/groups/server/meeting-schedule";
import { sendAssignmentNotification } from "@/features/notifications/server/assignment-notifications";
import { practiceRangeSchema, referenceOrder } from "@/features/practice/types";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";

const inputSchema = practiceRangeSchema.extend({
    groupId: z.string().min(1),
    assigneeId: z.string().min(1),
    dueMeetingStartsAt: z.iso.datetime(),
    instructions: z.string().trim().max(500).optional(),
});

export default async function createMemberAssignment(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const, reason: "unauthorized" };

    const [adminMembership, assigneeMembership] = await Promise.all([
        db
            .select({ id: groupMember.id })
            .from(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.userId, session.user.id),
                    eq(groupMember.role, "supervisor"),
                ),
            )
            .limit(1),
        db
            .select({ id: groupMember.id })
            .from(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.userId, parsed.data.assigneeId),
                ),
            )
            .limit(1),
    ]);

    if (!adminMembership[0] || !assigneeMembership[0]) {
        return { success: false as const, reason: "unauthorized" };
    }

    const meeting = await getGroupMeetingForUser(
        parsed.data.groupId,
        session.user.id,
    );
    const upcomingMeetingStarts = meeting
        ? getUpcomingMeetingOccurrences({ ...meeting, limit: 12 })
        : [];
    const selectedMeetingTime = new Date(
        parsed.data.dueMeetingStartsAt,
    ).getTime();
    const isScheduledMeeting = upcomingMeetingStarts.some(
        (startsAt) => new Date(startsAt).getTime() === selectedMeetingTime,
    );

    if (!isScheduledMeeting) {
        return { success: false as const, reason: "invalid_meeting" };
    }

    const [settings] = await db
        .select({ riwayah: userSettings.riwayah })
        .from(userSettings)
        .where(eq(userSettings.userId, parsed.data.assigneeId))
        .limit(1);
    const riwayah = settings?.riwayah ?? "hafs";
    const counts = new Map<number, number>();

    if (riwayah === "warsh") {
        const chapters = await getWarshChapters();
        for (const chapter of chapters)
            counts.set(chapter.id, chapter.verses.length);
    } else {
        const surahs = await getSurahsMeta();
        for (const surah of surahs)
            counts.set(surah.number, surah.numberOfAyahs);
    }

    const { start, end } = parsed.data;
    const referencesExist =
        start.ayahNumber <= (counts.get(start.surahNumber) ?? 0) &&
        end.ayahNumber <= (counts.get(end.surahNumber) ?? 0);
    if (!referencesExist || referenceOrder(start) > referenceOrder(end)) {
        return { success: false as const, reason: "invalid_range" };
    }

    const assignmentId = crypto.randomUUID();
    try {
        const saved = await db.transaction(async (tx) => {
            await tx
                .select({ id: memorizationGroup.id })
                .from(memorizationGroup)
                .where(eq(memorizationGroup.id, parsed.data.groupId))
                .for("update");
            const current = await getGroupMeetingForUser(
                parsed.data.groupId,
                session.user.id,
                tx,
            );
            if (
                !current ||
                !getUpcomingMeetingOccurrences({
                    ...current,
                    limit: 12,
                }).includes(parsed.data.dueMeetingStartsAt)
            )
                return false;
            await tx.insert(practiceAssignment).values({
                id: assignmentId,
                groupId: parsed.data.groupId,
                assigneeId: parsed.data.assigneeId,
                assignedById: session.user.id,
                kind: parsed.data.kind,
                riwayah,
                startSurahNumber: start.surahNumber,
                startAyahNumber: start.ayahNumber,
                endSurahNumber: end.surahNumber,
                endAyahNumber: end.ayahNumber,
                status: "in_progress",
                dueAt: new Date(parsed.data.dueMeetingStartsAt),
                instructions: parsed.data.instructions || null,
            });
            return true;
        });
        if (!saved)
            return { success: false as const, reason: "invalid_meeting" };
    } catch {
        return { success: false as const, reason: "failed" };
    }

    after(async () => {
        await Promise.allSettled([
            sendAssignmentNotification(assignmentId, "published"),
        ]);
    });

    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/assignments");
    revalidatePath("/practice");
    revalidatePath("/dashboard");
    return { success: true as const };
}
