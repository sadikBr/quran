"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingSchedule,
    groupMember,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { isValidTimezone } from "./meeting-schedule";

const slotSchema = z.object({
    weekday: z.number().int().min(1).max(7),
    localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const inputSchema = z.object({
    groupId: z.string().min(1),
    timezone: z.string().min(1).max(100),
    schedule: z.array(slotSchema).min(1).max(14),
});

function uniqueSchedule(schedule: Array<z.infer<typeof slotSchema>>) {
    const keys = schedule.map((slot) => `${slot.weekday}:${slot.localTime}`);
    return new Set(keys).size === keys.length;
}

export default async function saveGroupMeeting(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (
        !parsed.success ||
        !isValidTimezone(parsed.data.timezone) ||
        !uniqueSchedule(parsed.data.schedule)
    ) {
        return { success: false as const, reason: "invalid" as const };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return { success: false as const, reason: "unauthorized" as const };
    }

    const [membership] = await db
        .select({ role: groupMember.role })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, parsed.data.groupId),
                eq(groupMember.userId, session.user.id),
                eq(groupMember.role, "admin"),
            ),
        )
        .limit(1);
    if (!membership) {
        return { success: false as const, reason: "unauthorized" as const };
    }

    await db.transaction(async (transaction) => {
        const [existing] = await transaction
            .select({ id: groupMeeting.id })
            .from(groupMeeting)
            .where(eq(groupMeeting.groupId, parsed.data.groupId))
            .limit(1);

        const meetingId = existing?.id ?? crypto.randomUUID();
        if (existing) {
            await transaction
                .update(groupMeeting)
                .set({
                    timezone: parsed.data.timezone,
                    updatedAt: new Date(),
                })
                .where(eq(groupMeeting.id, meetingId));
            await transaction
                .delete(groupMeetingSchedule)
                .where(eq(groupMeetingSchedule.meetingId, meetingId));
        } else {
            await transaction.insert(groupMeeting).values({
                id: meetingId,
                groupId: parsed.data.groupId,
                hostUserId: session.user.id,
                roomName: `circle-${crypto.randomUUID()}`,
                timezone: parsed.data.timezone,
            });
        }

        await transaction.insert(groupMeetingSchedule).values(
            parsed.data.schedule.map((slot) => ({
                id: crypto.randomUUID(),
                meetingId,
                weekday: slot.weekday,
                localTime: slot.localTime,
            })),
        );
    });

    revalidatePath(`/groups/${parsed.data.groupId}`);
    return { success: true as const };
}
