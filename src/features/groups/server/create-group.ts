"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingSchedule,
    groupMember,
    memorizationGroup,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { isValidTimezone } from "./meeting-schedule";

const inputSchema = z.object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(300).optional(),
    timezone: z.string().min(1).max(100),
    schedule: z
        .array(
            z.object({
                weekday: z.number().int().min(1).max(7),
                localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            }),
        )
        .min(1)
        .max(14),
});

function createInviteCode() {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}

export default async function createGroup(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success || !isValidTimezone(parsed.data.timezone)) {
        return { success: false as const };
    }
    const slotKeys = parsed.data.schedule.map(
        (slot) => `${slot.weekday}:${slot.localTime}`,
    );
    if (new Set(slotKeys).size !== slotKeys.length) {
        return { success: false as const };
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };

    const groupId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const meetingId = crypto.randomUUID();

    try {
        await db.transaction(async (transaction) => {
            await transaction.insert(memorizationGroup).values({
                id: groupId,
                name: parsed.data.name,
                description: parsed.data.description || null,
                inviteCode: createInviteCode(),
                createdById: session.user.id,
            });
            await transaction.insert(groupMember).values({
                id: membershipId,
                groupId,
                userId: session.user.id,
                role: "admin",
            });
            await transaction.insert(groupMeeting).values({
                id: meetingId,
                groupId,
                hostUserId: session.user.id,
                roomName: `circle-${crypto.randomUUID()}`,
                timezone: parsed.data.timezone,
            });
            await transaction.insert(groupMeetingSchedule).values(
                parsed.data.schedule.map((slot) => ({
                    id: crypto.randomUUID(),
                    meetingId,
                    weekday: slot.weekday,
                    localTime: slot.localTime,
                })),
            );
        });
    } catch {
        return { success: false as const };
    }

    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return { success: true as const, groupId };
}
