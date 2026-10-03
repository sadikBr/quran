import { DateTime } from "luxon";
import {
    type Assessment,
    assessmentVerses,
    isMemorized,
    type MemoryCatalogue,
} from "@/features/memorization/progress";
import {
    generateRevisionSchedule,
    type RevisionHistory,
    type RevisionSettings,
    revisionCoverage,
    type ScheduledRange,
    weekPeerAtoms,
} from "./schedule";

type SavedSession = ScheduledRange & {
    id: string;
    completedAt: Date | null;
    progressSurahNumber: number | null;
    progressAyahNumber: number | null;
};
type Replacement = ScheduledRange & {
    progressSurahNumber: number | null;
    progressAyahNumber: number | null;
};

/** Repair the saved batch without moving valid sessions or discarding completed work. */
export function reconcileRevisionSessions({
    catalogue,
    week,
    sessions,
    covered,
    assessments,
    history,
    now,
}: {
    catalogue: MemoryCatalogue;
    week: RevisionSettings & { weekStart: string };
    sessions: SavedSession[];
    covered: Set<string>;
    assessments: Assessment[];
    history: RevisionHistory[];
    now: Date;
}) {
    const removed: string[] = [];
    const replacements: Replacement[] = [];
    const retained: (SavedSession | Replacement)[] = [];
    const affected = new Set<string>();
    const peer = weekPeerAtoms(
        catalogue,
        assessments,
        week.weekStart,
        week.timezone,
        now,
    );
    for (const session of sessions) {
        const range = { ...session, riwayah: week.riwayah };
        const verses = assessmentVerses(catalogue, range);
        const credit = session.reviewAfter
            ? weekPeerAtoms(
                  catalogue,
                  assessments,
                  week.weekStart,
                  week.timezone,
                  now,
                  session.reviewAfter,
              )
            : peer;
        if (
            revisionCoverage(catalogue, range, credit).done ||
            verses.every((verse) => isMemorized(verse, covered))
        ) {
            retained.push(session);
            continue;
        }
        removed.push(session.id);
        affected.add(session.scheduledDate);
        const runs: (typeof verses)[] = [];
        let run: typeof verses = [];
        for (const verse of verses) {
            if (!isMemorized(verse, covered)) {
                run = [];
                continue;
            }
            if (!run.length) runs.push(run);
            run.push(verse);
        }
        for (const segment of runs) {
            const start = segment[0],
                end = segment[segment.length - 1];
            const progress = segment.findLast(
                (verse) =>
                    verse.surahNumber * 1000 + verse.ayahNumber <=
                    (session.progressSurahNumber ?? 0) * 1000 +
                        (session.progressAyahNumber ?? 0),
            );
            const replacement = {
                scheduledDate: session.scheduledDate,
                reviewAfter: session.reviewAfter,
                ordinal: 0,
                quarters: [...new Set(segment.map((verse) => verse.quarter))],
                startSurahNumber: start.surahNumber,
                startAyahNumber: start.ayahNumber,
                endSurahNumber: end.surahNumber,
                endAyahNumber: end.ayahNumber,
                progressSurahNumber: progress?.surahNumber ?? null,
                progressAyahNumber: progress?.ayahNumber ?? null,
            };
            replacements.push(replacement);
            retained.push(replacement);
        }
    }
    // Reserve all retained passages across the batch, including completed work.
    // A freed slot must not repeat another session or a circle review.
    const reserved = new Set(peer);
    const reservedQuarters = new Set(
        retained.flatMap((session) => session.quarters),
    );
    for (const session of retained)
        for (const verse of assessmentVerses(catalogue, {
            ...session,
            riwayah: week.riwayah,
        }))
            for (const atom of verse.atoms) reserved.add(atom);
    const available = () =>
        new Set(
            catalogue[week.riwayah]
                .filter((verse) => !reservedQuarters.has(verse.quarter))
                .flatMap((verse) => verse.atoms)
                .filter((atom) => covered.has(atom) && !reserved.has(atom)),
        );
    const append = (schedule: ScheduledRange[]) => {
        for (const range of schedule) {
            for (const quarter of range.quarters) reservedQuarters.add(quarter);
            replacements.push({
                ...range,
                progressSurahNumber: null,
                progressAyahNumber: null,
            });
            for (const verse of assessmentVerses(catalogue, {
                ...range,
                riwayah: week.riwayah,
            }))
                for (const atom of verse.atoms) reserved.add(atom);
        }
    };
    for (const date of [...affected].sort()) {
        const originalSize = new Set(
            sessions
                .filter((s) => s.scheduledDate === date)
                .flatMap((s) => s.quarters),
        ).size;
        const retainedSize = new Set(
            retained
                .filter((s) => s.scheduledDate === date)
                .flatMap((s) => s.quarters),
        ).size;
        const capacity = Math.max(
            0,
            Math.min(week.quartersPerDay, originalSize) - retainedSize,
        );
        if (!capacity) continue;
        const day = DateTime.fromISO(date, { zone: week.timezone });
        append(
            generateRevisionSchedule({
                catalogue,
                settings: { ...week, days: [day.weekday] },
                dailyCapacity: capacity,
                completedHizbs: [],
                covered: available(),
                assessments,
                history,
                weekStart: day.startOf("week").toISODate() as string,
                fromDate: date,
            }),
        );
    }
    // An empty saved batch can become usable again after memorization is added.
    if (!sessions.length) {
        const today = DateTime.fromJSDate(now, {
            zone: week.timezone,
        }).toISODate() as string;
        append(
            generateRevisionSchedule({
                catalogue,
                settings: week,
                completedHizbs: [],
                covered: available(),
                assessments,
                history,
                weekStart: week.weekStart,
                fromDate: today > week.weekStart ? today : week.weekStart,
            }),
        );
    }
    const nextOrdinal = Math.max(-1, ...sessions.map((s) => s.ordinal)) + 1;
    replacements.sort(
        (a, b) =>
            a.scheduledDate.localeCompare(b.scheduledDate) ||
            a.startSurahNumber - b.startSurahNumber ||
            a.startAyahNumber - b.startAyahNumber,
    );
    return {
        removed,
        replacements: replacements.map((range, i) => ({
            ...range,
            ordinal: nextOrdinal + i,
        })),
    };
}
