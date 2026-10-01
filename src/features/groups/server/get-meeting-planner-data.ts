import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import db from "@/drizzle/db";
import { practiceAssignment } from "@/drizzle/schema";
import type { PracticeKind, QuranReference } from "@/features/practice/types";
import type { Riwayah } from "@/features/settings/preferences";
import type {
    MeetingPlanAssignment,
    MeetingPlannerData,
} from "../meeting-plan-types";

function mapAssignment(row: {
    assigneeId: string;
    kind: string;
    riwayah: string;
    startSurahNumber: number;
    startAyahNumber: number;
    endSurahNumber: number;
    endAyahNumber: number;
    instructions: string | null;
}): MeetingPlanAssignment {
    return {
        assigneeId: row.assigneeId,
        kind: row.kind as PracticeKind,
        riwayah: row.riwayah as Riwayah,
        start: {
            surahNumber: row.startSurahNumber,
            ayahNumber: row.startAyahNumber,
        } satisfies QuranReference,
        end: {
            surahNumber: row.endSurahNumber,
            ayahNumber: row.endAyahNumber,
        } satisfies QuranReference,
        instructions: row.instructions ?? "",
    };
}

const selection = {
    id: practiceAssignment.id,
    status: practiceAssignment.status,
    assigneeId: practiceAssignment.assigneeId,
    kind: practiceAssignment.kind,
    riwayah: practiceAssignment.riwayah,
    startSurahNumber: practiceAssignment.startSurahNumber,
    startAyahNumber: practiceAssignment.startAyahNumber,
    endSurahNumber: practiceAssignment.endSurahNumber,
    endAyahNumber: practiceAssignment.endAyahNumber,
    instructions: practiceAssignment.instructions,
    dueAt: practiceAssignment.dueAt,
};

export default async function getMeetingPlannerData(
    groupId: string,
): Promise<MeetingPlannerData> {
    const [draftRows, publishedRows] = await Promise.all([
        db
            .select(selection)
            .from(practiceAssignment)
            .where(
                and(
                    eq(practiceAssignment.groupId, groupId),
                    eq(practiceAssignment.status, "draft"),
                ),
            )
            .orderBy(practiceAssignment.createdAt),
        db
            .select(selection)
            .from(practiceAssignment)
            .where(
                and(
                    eq(practiceAssignment.groupId, groupId),
                    ne(practiceAssignment.status, "draft"),
                ),
            )
            .orderBy(
                desc(practiceAssignment.dueAt),
                desc(practiceAssignment.createdAt),
            ),
    ]);

    const previousDueAt = publishedRows.find((row) => row.dueAt)?.dueAt ?? null;
    const previousTimestamp = previousDueAt?.getTime();
    const previousRows = previousTimestamp
        ? publishedRows.filter(
              (row) => row.dueAt?.getTime() === previousTimestamp,
          )
        : [];

    return {
        published: publishedRows.map((row) => ({
            ...mapAssignment(row),
            id: row.id,
            status: row.status,
            dueAt: row.dueAt?.toISOString() ?? null,
        })),
        drafts: draftRows
            .filter((row) => row.dueAt !== null)
            .map((row) => ({
                ...mapAssignment(row),
                dueMeetingStartsAt: row.dueAt?.toISOString() ?? "",
            })),
        previousMeetingStartsAt: previousDueAt?.toISOString() ?? null,
        previousAssignments: previousRows.map(mapAssignment),
    };
}
