"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const inputSchema = z.object({ assignmentId: z.string().min(1) });

export default async function deletePracticeAssignment(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };

    try {
        const deleted = await db
            .delete(practiceAssignment)
            .where(
                and(
                    eq(practiceAssignment.id, parsed.data.assignmentId),
                    eq(practiceAssignment.assigneeId, session.user.id),
                    eq(practiceAssignment.assignedById, session.user.id),
                    isNull(practiceAssignment.groupId),
                ),
            )
            .returning({ id: practiceAssignment.id });

        if (deleted.length === 0) return { success: false as const };
    } catch {
        return { success: false as const };
    }

    revalidatePath("/practice");
    revalidatePath("/practice/read");
    revalidatePath("/dashboard");
    return { success: true as const };
}
