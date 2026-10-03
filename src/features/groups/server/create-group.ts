"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    adminActivity,
    groupMeeting,
    groupMeetingSchedule,
    groupMember,
    memorizationGroup,
    user,
} from "@/drizzle/schema";
import { getPlatformAdmin } from "@/features/auth/permissions";
import { isValidTimezone } from "./meeting-schedule";

const inputSchema = z.object({
    supervisorId: z.string().min(1).optional(),
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

    const admin = await getPlatformAdmin();
    if (!admin) return { success: false as const };

    const groupId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const meetingId = crypto.randomUUID();

    try {
        await db.transaction(async (transaction) => {
            const [supervisor] = parsed.data.supervisorId
                ? await transaction
                      .select()
                      .from(user)
                      .where(eq(user.id, parsed.data.supervisorId))
                      .for("update")
                : [];
            if (
                parsed.data.supervisorId &&
                (!supervisor ||
                    supervisor.role !== "member" ||
                    supervisor.suspendedAt)
            )
                throw new Error("Invalid supervisor");
            await transaction.insert(memorizationGroup).values({
                id: groupId,
                name: parsed.data.name,
                description: parsed.data.description || null,
                isActive: false,
                inviteCode: createInviteCode(),
                createdById: admin.id,
            });
            if (supervisor)
                await transaction.insert(groupMember).values({
                    id: membershipId,
                    groupId,
                    userId: supervisor.id,
                    role: "supervisor",
                });
            await transaction.insert(groupMeeting).values({
                id: meetingId,
                groupId,
                hostUserId: supervisor?.id ?? null,
                enabled: Boolean(supervisor),
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
            await transaction.insert(adminActivity).values({
                id: crypto.randomUUID(),
                actorId: admin.id,
                action: "circle_created",
                groupId,
                groupName: parsed.data.name,
                details: { supervisorId: supervisor?.id },
            });
        });
    } catch {
        return { success: false as const };
    }

    revalidatePath("/groups");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true as const, groupId };
}
