"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const inputSchema = z.object({ assignmentId: z.string().min(1) });

export default async function submitPracticeAssignment(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };

    const [assignment] = await db
        .select()
        .from(practiceAssignment)
        .where(
            and(
                eq(practiceAssignment.id, parsed.data.assignmentId),
                eq(practiceAssignment.assigneeId, session.user.id),
                isNotNull(practiceAssignment.groupId),
            ),
        )
        .limit(1);

    const reachedEnd =
        assignment?.progressSurahNumber === assignment?.endSurahNumber &&
        assignment?.progressAyahNumber === assignment?.endAyahNumber;
    if (!assignment || !reachedEnd) return { success: false as const };

    await db
        .update(practiceAssignment)
        .set({
            status: "submitted",
            submittedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(practiceAssignment.id, assignment.id));

    revalidatePath("/practice");
    revalidatePath("/assignments");
    revalidatePath(`/practice/${assignment.id}/read`);
    if (assignment.groupId) revalidatePath(`/groups/${assignment.groupId}`);
    revalidatePath("/dashboard");
    return { success: true as const };
}
