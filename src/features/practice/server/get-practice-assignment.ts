import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import db from "@/drizzle/db";
import { memorizationGroup, practiceAssignment, user } from "@/drizzle/schema";
import type { Riwayah } from "@/features/settings/preferences";
import type { PracticeAssignment, PracticeKind } from "../types";

const activeStatuses = ["in_progress", "submitted", "needs_revision"];

type AssignmentRow = typeof practiceAssignment.$inferSelect & {
    groupName: string | null;
    assignedByName: string | null;
};

function mapAssignment(result: AssignmentRow): PracticeAssignment {
    return {
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
        source: result.groupId ? "group" : "personal",
        groupId: result.groupId,
        groupName: result.groupName,
        assignedByName: result.assignedByName,
        instructions: result.instructions,
        dueAt: result.dueAt,
        reviewNote: result.reviewNote,
        submittedAt: result.submittedAt,
        reviewedAt: result.reviewedAt,
    };
}

function assignmentSelection() {
    return {
        id: practiceAssignment.id,
        assigneeId: practiceAssignment.assigneeId,
        assignedById: practiceAssignment.assignedById,
        groupId: practiceAssignment.groupId,
        kind: practiceAssignment.kind,
        riwayah: practiceAssignment.riwayah,
        startSurahNumber: practiceAssignment.startSurahNumber,
        startAyahNumber: practiceAssignment.startAyahNumber,
        endSurahNumber: practiceAssignment.endSurahNumber,
        endAyahNumber: practiceAssignment.endAyahNumber,
        progressSurahNumber: practiceAssignment.progressSurahNumber,
        progressAyahNumber: practiceAssignment.progressAyahNumber,
        status: practiceAssignment.status,
        instructions: practiceAssignment.instructions,
        dueAt: practiceAssignment.dueAt,
        reviewNote: practiceAssignment.reviewNote,
        submittedAt: practiceAssignment.submittedAt,
        reviewedAt: practiceAssignment.reviewedAt,
        createdAt: practiceAssignment.createdAt,
        updatedAt: practiceAssignment.updatedAt,
        groupName: memorizationGroup.name,
        assignedByName: user.name,
    };
}

export default async function getPracticeAssignment(
    userId: string,
    assignmentId?: string,
): Promise<PracticeAssignment | null> {
    if (!assignmentId) {
        const [personal, assigned] = await Promise.all([
            getPracticeAssignments(userId),
            getAssignedPracticeAssignments(userId),
        ]);
        return assigned[0] ?? personal[0] ?? null;
    }

    const [result] = await db
        .select(assignmentSelection())
        .from(practiceAssignment)
        .leftJoin(
            memorizationGroup,
            eq(practiceAssignment.groupId, memorizationGroup.id),
        )
        .leftJoin(user, eq(practiceAssignment.assignedById, user.id))
        .where(
            and(
                eq(practiceAssignment.id, assignmentId),
                eq(practiceAssignment.assigneeId, userId),
                inArray(practiceAssignment.status, activeStatuses),
            ),
        )
        .limit(1);

    return result ? mapAssignment(result) : null;
}

export async function getPracticeAssignments(
    userId: string,
): Promise<PracticeAssignment[]> {
    const results = await db
        .select(assignmentSelection())
        .from(practiceAssignment)
        .leftJoin(
            memorizationGroup,
            eq(practiceAssignment.groupId, memorizationGroup.id),
        )
        .leftJoin(user, eq(practiceAssignment.assignedById, user.id))
        .where(
            and(
                eq(practiceAssignment.assigneeId, userId),
                isNull(practiceAssignment.groupId),
                inArray(practiceAssignment.status, activeStatuses),
            ),
        )
        .orderBy(desc(practiceAssignment.updatedAt));

    return results
        .map(mapAssignment)
        .sort((left, right) =>
            left.kind === right.kind
                ? 0
                : left.kind === "memorization"
                  ? -1
                  : 1,
        );
}

export async function getAssignedPracticeAssignments(
    userId: string,
): Promise<PracticeAssignment[]> {
    const results = await db
        .select(assignmentSelection())
        .from(practiceAssignment)
        .leftJoin(
            memorizationGroup,
            eq(practiceAssignment.groupId, memorizationGroup.id),
        )
        .leftJoin(user, eq(practiceAssignment.assignedById, user.id))
        .where(
            and(
                eq(practiceAssignment.assigneeId, userId),
                isNotNull(practiceAssignment.groupId),
                inArray(practiceAssignment.status, activeStatuses),
            ),
        )
        .orderBy(practiceAssignment.dueAt, desc(practiceAssignment.createdAt));

    return results.map(mapAssignment);
}
