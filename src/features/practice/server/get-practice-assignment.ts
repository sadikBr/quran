import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import db from "@/drizzle/db";
import { practiceAssignment } from "@/drizzle/schema";
import type { Riwayah } from "@/features/settings/preferences";
import type { PracticeAssignment, PracticeKind } from "../types";

export default async function getPracticeAssignment(
    userId: string,
    assignmentId?: string,
): Promise<PracticeAssignment | null> {
    const assignments = await getPracticeAssignments(userId);
    return assignmentId
        ? (assignments.find((assignment) => assignment.id === assignmentId) ??
              null)
        : (assignments[0] ?? null);
}

export async function getPracticeAssignments(
    userId: string,
): Promise<PracticeAssignment[]> {
    const results = await db
        .select()
        .from(practiceAssignment)
        .where(
            and(
                eq(practiceAssignment.assigneeId, userId),
                isNull(practiceAssignment.groupId),
                inArray(practiceAssignment.status, [
                    "in_progress",
                    "submitted",
                    "needs_revision",
                ]),
            ),
        )
        .orderBy(desc(practiceAssignment.updatedAt));

    return results
        .map((result) => ({
            id: result.id,
            kind: result.kind as PracticeKind,
            riwayah: result.riwayah as Riwayah,
            start: {
                surahNumber: result.startSurahNumber,
                ayahNumber: result.startAyahNumber,
            },
            end: {
                surahNumber: result.endSurahNumber,
                ayahNumber: result.endAyahNumber,
            },
            progress:
                result.progressSurahNumber && result.progressAyahNumber
                    ? {
                          surahNumber: result.progressSurahNumber,
                          ayahNumber: result.progressAyahNumber,
                      }
                    : null,
            status: result.status as PracticeAssignment["status"],
        }))
        .sort((left, right) =>
            left.kind === right.kind
                ? 0
                : left.kind === "memorization"
                  ? -1
                  : 1,
        );
}
