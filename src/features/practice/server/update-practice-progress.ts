"use server";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { practiceAssignment } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { activeGroup } from "@/features/groups/server/group-workflow";
import {
    isReferenceWithin,
    quranReferenceSchema,
    referenceOrder,
} from "../types";

const inputSchema = quranReferenceSchema.extend({ assignmentId: z.string() });

export default async function updatePracticeProgress(input: unknown) {
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
            ),
        )
        .limit(1);

    if (!assignment) return { success: false as const };

    const reference = {
        surahNumber: parsed.data.surahNumber,
        ayahNumber: parsed.data.ayahNumber,
    };
    const start = {
        surahNumber: assignment.startSurahNumber,
        ayahNumber: assignment.startAyahNumber,
    };
    const end = {
        surahNumber: assignment.endSurahNumber,
        ayahNumber: assignment.endAyahNumber,
    };

    if (!isReferenceWithin(reference, start, end)) {
        return { success: false as const };
    }

    const updated = await db
        .update(practiceAssignment)
        .set({
            progressSurahNumber: reference.surahNumber,
            progressAyahNumber: reference.ayahNumber,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(practiceAssignment.id, assignment.id),
                or(
                    isNull(practiceAssignment.groupId),
                    activeGroup(practiceAssignment.groupId),
                ),
                eq(practiceAssignment.assigneeId, session.user.id),
                inArray(practiceAssignment.status, [
                    "in_progress",
                    "submitted",
                    "needs_revision",
                    "not_completed",
                ]),
            ),
        )
        .returning({ id: practiceAssignment.id });
    if (!updated.length) return { success: false as const };

    revalidatePath("/practice");
    revalidatePath("/assignments");
    revalidatePath("/practice/read");
    revalidatePath("/dashboard");
    return {
        success: true as const,
        completed: referenceOrder(reference) === referenceOrder(end),
    };
}
