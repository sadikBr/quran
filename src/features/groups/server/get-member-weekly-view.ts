import "server-only";

import { getAssignedPracticeAssignments } from "@/features/practice/server/get-practice-assignment";
import type {
    PracticeAssignment,
    QuranReference,
} from "@/features/practice/types";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";

export type WeeklyAssignmentPeriod = "overdue" | "this_week" | "upcoming";

export interface WeeklyAssignment extends PracticeAssignment {
    completedAyahs: number;
    totalAyahs: number;
    percentage: number;
    period: WeeklyAssignmentPeriod;
}

export interface MemberWeeklyView {
    weekStart: Date;
    weekEnd: Date;
    assignments: WeeklyAssignment[];
    surahs: Array<{
        number: number;
        name: string;
        englishName: string;
    }>;
}

function currentWeek(now = new Date()) {
    const start = new Date(now);
    const daysSinceMonday = (start.getUTCDay() + 6) % 7;
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
}

function referencePosition(
    reference: QuranReference,
    counts: Map<number, number>,
) {
    let position = reference.ayahNumber;
    for (
        let surahNumber = 1;
        surahNumber < reference.surahNumber;
        surahNumber += 1
    ) {
        position += counts.get(surahNumber) ?? 0;
    }
    return position;
}

function progressForAssignment(
    assignment: PracticeAssignment,
    counts: Map<number, number>,
) {
    const start = referencePosition(assignment.start, counts);
    const end = referencePosition(assignment.end, counts);
    const totalAyahs = Math.max(1, end - start + 1);
    const completedAyahs = assignment.progress
        ? Math.min(
              totalAyahs,
              Math.max(
                  0,
                  referencePosition(assignment.progress, counts) - start + 1,
              ),
          )
        : 0;

    return {
        completedAyahs,
        totalAyahs,
        percentage: Math.round((completedAyahs / totalAyahs) * 100),
    };
}

export default async function getMemberWeeklyView(
    userId: string,
): Promise<MemberWeeklyView> {
    const assignments = await getAssignedPracticeAssignments(userId);
    const { start: weekStart, end: weekEnd } = currentWeek();
    if (assignments.length === 0) {
        return { weekStart, weekEnd, assignments: [], surahs: [] };
    }

    const needsWarsh = assignments.some(
        (assignment) => assignment.riwayah === "warsh",
    );
    const [surahs, warshChapters] = await Promise.all([
        getSurahsMeta(),
        needsWarsh ? getWarshChapters() : Promise.resolve([]),
    ]);
    const hafsCounts = new Map(
        surahs.map((surah) => [surah.number, surah.numberOfAyahs]),
    );
    const warshCounts = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter.verses.length]),
    );
    return {
        weekStart,
        weekEnd,
        surahs: surahs.map(({ number, name, englishName }) => ({
            number,
            name,
            englishName,
        })),
        assignments: assignments.map((assignment) => {
            const dueAt = assignment.dueAt;
            const period: WeeklyAssignmentPeriod =
                dueAt && dueAt < weekStart
                    ? "overdue"
                    : dueAt && dueAt <= weekEnd
                      ? "this_week"
                      : "upcoming";
            const counts =
                assignment.riwayah === "warsh" ? warshCounts : hafsCounts;

            return {
                ...assignment,
                ...progressForAssignment(assignment, counts),
                period,
            };
        }),
    };
}
