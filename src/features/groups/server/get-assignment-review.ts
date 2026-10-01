import "server-only";

import { and, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMember,
    memorizationGroup,
    practiceAssignment,
    user,
} from "@/drizzle/schema";
import type {
    PracticeAssignment,
    PracticeKind,
} from "@/features/practice/types";
import type { Riwayah } from "@/features/settings/preferences";
import {
    assignmentReadPermission,
    assignmentReviewPermission,
} from "./assignment-review-permission";

export interface AssignmentReviewData {
    assignment: PracticeAssignment;
    canReview: boolean;
    assignee: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
}

export default async function getAssignmentReview(
    groupId: string,
    assignmentId: string,
    reviewerUserId: string,
): Promise<AssignmentReviewData | null> {
    const [row] = await db
        .select({
            id: practiceAssignment.id,
            canReview: assignmentReviewPermission(reviewerUserId),
            groupId: practiceAssignment.groupId,
            groupName: memorizationGroup.name,
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
            reviewMethod: practiceAssignment.reviewMethod,
            assigneeId: user.id,
            assigneeName: user.name,
            assigneeEmail: user.email,
            assigneeImage: user.image,
        })
        .from(practiceAssignment)
        .innerJoin(
            memorizationGroup,
            eq(practiceAssignment.groupId, memorizationGroup.id),
        )
        .innerJoin(user, eq(practiceAssignment.assigneeId, user.id))
        .innerJoin(
            groupMember,
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, reviewerUserId),
                assignmentReadPermission(reviewerUserId),
            ),
        )
        .where(
            and(
                eq(practiceAssignment.id, assignmentId),
                eq(practiceAssignment.groupId, groupId),
            ),
        )
        .limit(1);

    if (!row) return null;

    return {
        canReview: row.canReview,
        assignment: {
            id: row.id,
            kind: row.kind as PracticeKind,
            riwayah: row.riwayah as Riwayah,
            start: {
                surahNumber: row.startSurahNumber,
                ayahNumber: row.startAyahNumber,
            },
            end: {
                surahNumber: row.endSurahNumber,
                ayahNumber: row.endAyahNumber,
            },
            progress:
                row.progressSurahNumber && row.progressAyahNumber
                    ? {
                          surahNumber: row.progressSurahNumber,
                          ayahNumber: row.progressAyahNumber,
                      }
                    : null,
            status: row.status as PracticeAssignment["status"],
            source: "group",
            groupId: row.groupId,
            groupName: row.groupName,
            meetingTimezone: null,
            assignedByName: null,
            instructions: row.instructions,
            dueAt: row.dueAt,
            reviewNote: row.reviewNote,
            submittedAt: row.submittedAt,
            reviewedAt: row.reviewedAt,
            reviewMethod: row.reviewMethod,
        },
        assignee: {
            id: row.assigneeId,
            name: row.assigneeName,
            email: row.assigneeEmail,
            image: row.assigneeImage,
        },
    };
}
