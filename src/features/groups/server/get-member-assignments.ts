import "server-only";

import { preparedAyahs } from "@/features/practice/preparation-progress";
import { getAssignedPracticeAssignments } from "@/features/practice/server/get-practice-assignment";
import type {
    PracticeAssignment,
    QuranReference,
} from "@/features/practice/types";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";

export interface MemberAssignment extends PracticeAssignment {
    completedAyahs: number;
    totalAyahs: number;
    percentage: number;
}

export interface MemberAssignmentsView {
    assignments: MemberAssignment[];
    surahs: Array<{
        number: number;
        name: string;
        englishName: string;
    }>;
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
    const savedCount = assignment.progress
        ? Math.min(
              totalAyahs,
              Math.max(
                  0,
                  referencePosition(assignment.progress, counts) - start + 1,
              ),
          )
        : 0;
    const completedAyahs = preparedAyahs(
        assignment.status,
        totalAyahs,
        savedCount,
    );

    return {
        completedAyahs,
        totalAyahs,
        percentage: Math.round((completedAyahs / totalAyahs) * 100),
    };
}

export default async function getMemberAssignments(
    userId: string,
): Promise<MemberAssignmentsView> {
    const assignments = await getAssignedPracticeAssignments(userId);
    if (assignments.length === 0) {
        return { assignments: [], surahs: [] };
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
        surahs: surahs.map(({ number, name, englishName }) => ({
            number,
            name,
            englishName,
        })),
        assignments: assignments.map((assignment) => {
            const counts =
                assignment.riwayah === "warsh" ? warshCounts : hafsCounts;

            return {
                ...assignment,
                ...progressForAssignment(assignment, counts),
            };
        }),
    };
}
