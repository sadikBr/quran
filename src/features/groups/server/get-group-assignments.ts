import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import db from "@/drizzle/db";
import { groupMember, practiceAssignment, user } from "@/drizzle/schema";
import type { PracticeKind } from "@/features/practice/types";
import type { Riwayah } from "@/features/settings/preferences";

export interface GroupAssignmentSummary {
    id: string;
    assigneeId: string;
    assigneeName: string;
    kind: PracticeKind;
    riwayah: Riwayah;
    startSurahNumber: number;
    startAyahNumber: number;
    endSurahNumber: number;
    endAyahNumber: number;
    status: "in_progress" | "submitted" | "completed" | "needs_revision";
    dueAt: Date | null;
    instructions: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
}

export default async function getGroupAssignments(
    groupId: string,
    requestingUserId: string,
    isAdmin: boolean,
): Promise<GroupAssignmentSummary[]> {
    const visibleStatuses = [
        "in_progress",
        "submitted",
        "needs_revision",
        "completed",
    ];
    const conditions = [
        eq(practiceAssignment.groupId, groupId),
        inArray(practiceAssignment.status, visibleStatuses),
    ];
    if (!isAdmin)
        conditions.push(eq(practiceAssignment.assigneeId, requestingUserId));

    const rows = await db
        .select({
            id: practiceAssignment.id,
            assigneeId: practiceAssignment.assigneeId,
            assigneeName: user.name,
            kind: practiceAssignment.kind,
            riwayah: practiceAssignment.riwayah,
            startSurahNumber: practiceAssignment.startSurahNumber,
            startAyahNumber: practiceAssignment.startAyahNumber,
            endSurahNumber: practiceAssignment.endSurahNumber,
            endAyahNumber: practiceAssignment.endAyahNumber,
            status: practiceAssignment.status,
            dueAt: practiceAssignment.dueAt,
            instructions: practiceAssignment.instructions,
            reviewNote: practiceAssignment.reviewNote,
            reviewedAt: practiceAssignment.reviewedAt,
        })
        .from(practiceAssignment)
        .innerJoin(user, eq(practiceAssignment.assigneeId, user.id))
        .innerJoin(
            groupMember,
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, requestingUserId),
            ),
        )
        .where(and(...conditions))
        .orderBy(
            asc(practiceAssignment.dueAt),
            desc(practiceAssignment.createdAt),
        );

    return rows.map((row) => ({
        ...row,
        kind: row.kind as PracticeKind,
        riwayah: row.riwayah as Riwayah,
        status: row.status as GroupAssignmentSummary["status"],
    }));
}
