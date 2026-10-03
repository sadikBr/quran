import {
    assessmentVerses,
    type MemoryCatalogue,
    type Riwayah,
} from "@/features/memorization/progress";
import type { ScheduledRange } from "@/features/revision/schedule";

type SavedSession = ScheduledRange & {
    id: string;
    completedAt: Date | null;
    progressSurahNumber: number | null;
    progressAyahNumber: number | null;
};

/** Preserve history and safe bookmarks; replaced passages get new reader identities. */
export function reconcileMemorizationSessions(
    catalogue: MemoryCatalogue,
    riwayah: Riwayah,
    sessions: SavedSession[],
    desired: ScheduledRange[],
) {
    const pending = sessions.filter((s) => !s.completedAt);
    const references = (ranges: ScheduledRange[]) =>
        ranges.flatMap((range) =>
            assessmentVerses(catalogue, { ...range, riwayah }).map(
                (v) => `${v.surahNumber}:${v.ayahNumber}`,
            ),
        );
    // Unrelated corrections must not resplit the queue or move reading positions.
    if (
        JSON.stringify(references(pending)) ===
        JSON.stringify(references(desired))
    )
        return null;
    const position = (surah: number, ayah: number) => surah * 1000 + ayah;
    const start = (s: ScheduledRange) =>
        position(s.startSurahNumber, s.startAyahNumber);
    const end = (s: ScheduledRange) =>
        position(s.endSurahNumber, s.endAyahNumber);
    const nextOrdinal = Math.max(-1, ...sessions.map((s) => s.ordinal)) + 1;
    return {
        removed: pending.map((s) => s.id),
        replacements: desired.map((range, i) => {
            const exact = pending.find(
                (s) => start(s) === start(range) && end(s) === end(range),
            );
            // A shortened old passage can keep its bookmark. A passage containing
            // newly reintroduced earlier ayahs must start afresh.
            const previous =
                exact ??
                pending.find(
                    (s) => start(s) <= start(range) && end(s) >= end(range),
                );
            const bookmark =
                previous?.progressSurahNumber && previous.progressAyahNumber
                    ? position(
                          previous.progressSurahNumber,
                          previous.progressAyahNumber,
                      )
                    : 0;
            const progress =
                previous && bookmark >= start(range)
                    ? bookmark >= end(range)
                        ? {
                              surah: range.endSurahNumber,
                              ayah: range.endAyahNumber,
                          }
                        : {
                              surah: previous.progressSurahNumber,
                              ayah: previous.progressAyahNumber,
                          }
                    : null;
            return {
                ...range,
                id: exact?.id ?? crypto.randomUUID(),
                ordinal: nextOrdinal + i,
                progressSurahNumber: progress?.surah ?? null,
                progressAyahNumber: progress?.ayah ?? null,
            };
        }),
    };
}
