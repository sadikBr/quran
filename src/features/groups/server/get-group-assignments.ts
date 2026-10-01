import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import db from "@/drizzle/db";
import { groupMember, practiceAssignment, user } from "@/drizzle/schema";
import type { PracticeKind } from "@/features/practice/types";
import type { Riwayah } from "@/features/settings/preferences";
import { assignmentReadPermission } from "./assignment-review-permission";

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
    status:
        | "in_progress"
        | "submitted"
        | "completed"
        | "needs_revision"
        | "not_completed";
    dueAt: Date | null;
    instructions: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    reviewMethod: "self" | "peer" | null;
    reviewerName: string | null;
    submittedAt: Date | null;
}

export default async function getGroupAssignments(
    groupId: string,
    requestingUserId: string,
    includeReviewable: boolean,
): Promise<GroupAssignmentSummary[]> {
    const reviewer = alias(user, "assignment_reviewer");
    const visibleStatuses = [
        "in_progress",
        "submitted",
        "needs_revision",
        "not_completed",
        "completed",
    ];
    const conditions = [
        eq(practiceAssignment.groupId, groupId),
        inArray(practiceAssignment.status, visibleStatuses),
        assignmentReadPermission(requestingUserId),
    ];
    if (!includeReviewable)
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
            reviewMethod: practiceAssignment.reviewMethod,
            reviewerName: reviewer.name,
            submittedAt: practiceAssignment.submittedAt,
        })
        .from(practiceAssignment)
        .innerJoin(user, eq(practiceAssignment.assigneeId, user.id))
        .leftJoin(reviewer, eq(practiceAssignment.reviewedById, reviewer.id))
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
