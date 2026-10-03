import { DateTime } from "luxon";
import {
    type Assessment,
    assessmentVerses,
    type BaselineRange,
    baselineAtoms,
    isMemorized,
    type MemoryCatalogue,
    type MemoryVerse,
    type Riwayah,
} from "@/features/memorization/progress";

export type BaselineEvent = {
    id: string;
    createdAt: Date;
    hizbs: number[];
    ranges: BaselineRange[];
};
export type FollowUp = { due: string; stage: number };
export type LearningActivity = {
    id: string;
    at: Date;
    learned: Set<string>;
    reviewed: Set<string>;
    difficult: Set<string>;
};

/** Replay actual evidence, never planned sessions. Grid edits are not learning events. */
export function learningActivity({
    catalogue,
    baselineRiwayah,
    baselineEvents,
    initialCovered = new Set<string>(),
    assessments,
    timezone,
    now,
}: {
    catalogue: MemoryCatalogue;
    baselineRiwayah: Riwayah;
    baselineEvents: BaselineEvent[];
    initialCovered?: Set<string>;
    assessments: Assessment[];
    timezone: string;
    now: Date;
}) {
    let baseline = new Set(initialCovered);
    const earned = new Set<string>();
    const followUps = new Map<string, FollowUp>();
    const activity: LearningActivity[] = [];
    const events = [
        ...baselineEvents.map((event) => ({
            event,
            type: "baseline" as const,
        })),
        ...assessments.map((event) => ({ event, type: "assessment" as const })),
    ]
        .filter(({ event }) => +event.createdAt <= +now)
        .sort(
            (a, b) =>
                +a.event.createdAt - +b.event.createdAt ||
                // Setup and an assessment can share a transaction timestamp.
                (a.type === b.type
                    ? a.event.id.localeCompare(b.event.id)
                    : a.type === "baseline"
                      ? -1
                      : 1),
        );
    for (const entry of events) {
        if (entry.type === "baseline") {
            baseline = baselineAtoms(
                catalogue[baselineRiwayah],
                entry.event.hizbs,
                entry.event.ranges,
            );
            continue;
        }
        const event = entry.event;
        const date = DateTime.fromJSDate(event.createdAt, { zone: timezone });
        const today = date.toISODate() as string;
        const row: LearningActivity = {
            id: event.id,
            at: event.createdAt,
            learned: new Set(),
            reviewed: new Set(),
            difficult: new Set(),
        };
        for (const atom of new Set(
            assessmentVerses(catalogue, event).flatMap((v) => v.atoms),
        )) {
            const known = baseline.has(atom) || earned.has(atom);
            if (event.outcome === "confirmed" && !known) {
                row.learned.add(atom);
                followUps.set(atom, {
                    stage: 0,
                    due: date.plus({ days: 1 }).toISODate() as string,
                });
            } else if (known) {
                row.reviewed.add(atom);
                const followUp = followUps.get(atom);
                if (event.outcome === "needs_revision") {
                    row.difficult.add(atom);
                    if (followUp)
                        followUp.due = date
                            .plus({ days: 1 })
                            .toISODate() as string;
                } else if (followUp && today >= followUp.due) {
                    followUp.stage += 1;
                    if (followUp.stage >= 3) followUps.delete(atom);
                    else
                        followUp.due = date
                            .plus({ days: followUp.stage === 1 ? 3 : 7 })
                            .toISODate() as string;
                }
            }
            if (event.outcome === "confirmed") earned.add(atom);
        }
        activity.push(row);
    }
    return { activity, followUps };
}

export function connectingVerses(
    verses: MemoryVerse[],
    start: { surahNumber: number; ayahNumber: number },
    covered: Set<string>,
    limit = 3,
) {
    const index = verses.findIndex(
        (v) =>
            v.surahNumber === start.surahNumber &&
            v.ayahNumber === start.ayahNumber,
    );
    const result: MemoryVerse[] = [];
    for (let i = index - 1; i >= 0 && result.length < limit; i--) {
        const verse = verses[i];
        if (
            verse.surahNumber !== start.surahNumber ||
            !isMemorized(verse, covered)
        )
            break;
        result.unshift(verse);
    }
    return result;
}

export function weeklyLearningSummary(
    activity: LearningActivity[],
    verses: MemoryVerse[],
    weekStart: string,
    timezone: string,
    focusedPracticeDates: Date[] = [],
) {
    const start = DateTime.fromISO(weekStart, { zone: timezone }).startOf(
        "day",
    );
    const end = start.plus({ weeks: 1 });
    const rows = activity.filter((row) => +row.at >= +start && +row.at < +end);
    const union = (key: "learned" | "reviewed" | "difficult") =>
        new Set(rows.flatMap((row) => [...row[key]]));
    const count = (atoms: Set<string>) =>
        verses.filter((v) => isMemorized(v, atoms)).length;
    return {
        learned: count(union("learned")),
        reviewed: count(union("reviewed")),
        difficult: count(union("difficult")),
        // Partial native ayahs in another reading must not become whole-ayah credit.
        activityDays: new Set(
            [
                ...rows
                    .filter((r) => r.learned.size || r.reviewed.size)
                    .map((r) => r.at),
                ...focusedPracticeDates.filter(
                    (date) => +date >= +start && +date < +end,
                ),
            ].map((r) =>
                DateTime.fromJSDate(r, { zone: timezone }).toISODate(),
            ),
        ).size,
    };
}
