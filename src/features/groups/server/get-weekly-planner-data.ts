import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import db from "@/drizzle/db";
import { practiceAssignment } from "@/drizzle/schema";
import type { PracticeKind, QuranReference } from "@/features/practice/types";
import type { Riwayah } from "@/features/settings/preferences";
import type {
    WeeklyPlanAssignment,
    WeeklyPlannerData,
} from "../weekly-planner-types";

function calendarDate(value: Date | null) {
    return value?.toISOString().slice(0, 10) ?? null;
}

function mapAssignment(row: {
    assigneeId: string;
    kind: string;
    riwayah: string;
    startSurahNumber: number;
    startAyahNumber: number;
    endSurahNumber: number;
    endAyahNumber: number;
    instructions: string | null;
}): WeeklyPlanAssignment {
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

export default async function getWeeklyPlannerData(
    groupId: string,
): Promise<WeeklyPlannerData> {
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
        dueDate: calendarDate(draftRows[0]?.dueAt ?? null),
        drafts: draftRows.map(mapAssignment),
        previousDueDate: calendarDate(previousDueAt),
        previousAssignments: previousRows.map(mapAssignment),
    };
}
