"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { groupMeeting, groupMember, memorizationGroup } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const schema = z.object({
    groupId: z.string().min(1),
    hostUserId: z.string().min(1),
    expectedHostUserId: z.string().min(1),
});
export default async function changeMeetingHost(input: unknown) {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { success: false };
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false };
    const { groupId, hostUserId, expectedHostUserId } = parsed.data;
    try {
        const success = await db.transaction(async (tx) => {
            // Serialize with membership changes and meeting configuration.
            await tx
                .select({ id: memorizationGroup.id })
                .from(memorizationGroup)
                .where(eq(memorizationGroup.id, groupId))
                .for("update");
            const supervisors = await tx
                .select({ id: groupMember.userId })
                .from(groupMember)
                .where(
                    and(
                        eq(groupMember.groupId, groupId),
                        eq(groupMember.role, "supervisor"),
                    ),
                );
            if (
                !supervisors.some((row) => row.id === session.user.id) ||
                !supervisors.some((row) => row.id === hostUserId)
            )
                return false;
            const [meeting] = await tx
                .select()
                .from(groupMeeting)
                .where(eq(groupMeeting.groupId, groupId))
                .for("update");
            if (
                !meeting ||
                meeting.hostUserId !== expectedHostUserId ||
                (meeting.hostActiveUntil &&
                    meeting.hostActiveUntil.getTime() > Date.now())
            )
                return false;
            await tx
                .update(groupMeeting)
                .set({
                    hostUserId,
                    hostActiveUntil: null,
                    updatedAt: new Date(),
                })
                .where(eq(groupMeeting.id, meeting.id));
            return true;
        });
        if (success) {
            revalidatePath(`/groups/${groupId}`);
            revalidatePath(`/groups/${groupId}/meeting`);
        }
        return { success };
    } catch {
        return { success: false };
    }
}
