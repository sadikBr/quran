import type { Riwayah } from "@/features/memorization/progress";
import type { PracticeAssignment } from "@/features/practice/types";
import type { ScheduledRange } from "@/features/revision/schedule";

export function memorizationReaderAssignment(
    item: Omit<ScheduledRange, "scheduledDate"> & {
        id: string;
        done: boolean;
        completedAt?: string | null;
        progressSurahNumber?: number | null;
        progressAyahNumber?: number | null;
    },
    riwayah: Riwayah,
): PracticeAssignment {
    return {
        id: item.id,
        kind: "memorization",
        source: "weekly",
        riwayah,
        start: {
            surahNumber: item.startSurahNumber,
            ayahNumber: item.startAyahNumber,
        },
        end: {
            surahNumber: item.endSurahNumber,
            ayahNumber: item.endAyahNumber,
        },
        progress:
            item.progressSurahNumber && item.progressAyahNumber
                ? {
                      surahNumber: item.progressSurahNumber,
                      ayahNumber: item.progressAyahNumber,
                  }
                : null,
        status: item.done ? "completed" : "in_progress",
        groupId: null,
        groupName: null,
        meetingTimezone: null,
        assignedByName: null,
        instructions: null,
        dueAt: null,
        reviewNote: null,
        submittedAt: null,
        reviewedAt: null,
        reviewMethod: item.completedAt ? "self" : null,
    };
}
