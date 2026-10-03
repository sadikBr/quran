import { DateTime } from "luxon";
import {
    type Assessment,
    assessmentVerses,
    type MemoryCatalogue,
    type MemoryVerse,
    type Riwayah,
} from "@/features/memorization/progress";
import {
    generateMemorizationSchedule,
    type MemorizationSettings,
} from "./schedule";

export type MemorizationUsage = Map<string, Set<number>>;

/** Start the next batch on a saved day with room in its calendar-week budget. */
export function generateLimitedMemorizationSchedule({
    catalogue,
    settings,
    days,
    covered,
    fromDate,
    usage,
}: {
    catalogue: MemoryCatalogue;
    settings: MemorizationSettings;
    days: number[];
    covered: Set<string>;
    fromDate: string;
    usage: MemorizationUsage;
}) {
    let day = DateTime.fromISO(fromDate, { zone: settings.timezone });
    while (true) {
        if (days.length)
            while (!days.includes(day.weekday)) day = day.plus({ days: 1 });
        const weekStart = day.startOf("week").toISODate() as string;
        const start = day.toISODate() as string;
        const usedQuarters = usage.get(weekStart) ?? new Set<number>();
        const args = {
            catalogue,
            settings,
            days,
            covered,
            weekStart,
            fromDate: start,
        };
        const sessions = generateMemorizationSchedule({
            ...args,
            usedQuarters,
        });
        // Empty because there is no remaining material (or no saved day), rather
        // than because of the limit: there is nothing to defer.
        if (
            sessions.length ||
            !usedQuarters.size ||
            !generateMemorizationSchedule(args).length
        )
            return { weekStart, fromDate: start, sessions };
        day = day.startOf("week").plus({ weeks: 1 });
    }
}

export function quartersForAtoms(verses: MemoryVerse[], atoms: Set<string>) {
    return new Set(
        verses
            .filter((v) => v.atoms.some((atom) => atoms.has(atom)))
            .map((v) => v.quarter),
    );
}

// Count each quarter once in the local week where new memorization was confirmed.
// Existing baseline coverage and repeated revision never consume new capacity.
export function memorizationUsage(
    catalogue: MemoryCatalogue,
    riwayah: Riwayah,
    timezone: string,
    initialCovered: Set<string>,
    assessments: Assessment[],
): MemorizationUsage {
    const covered = new Set(initialCovered);
    const usage: MemorizationUsage = new Map();
    for (const assessment of [...assessments].sort(
        (a, b) => +a.createdAt - +b.createdAt || a.id.localeCompare(b.id),
    )) {
        if (assessment.outcome !== "confirmed") continue;
        const added = new Set<string>();
        for (const verse of assessmentVerses(catalogue, assessment)) {
            for (const atom of verse.atoms) {
                if (!covered.has(atom)) added.add(atom);
                covered.add(atom);
            }
        }
        if (!added.size) continue;
        const week = DateTime.fromJSDate(assessment.createdAt, {
            zone: timezone,
        })
            .startOf("week")
            .toISODate() as string;
        const quarters = usage.get(week) ?? new Set<number>();
        for (const quarter of quartersForAtoms(catalogue[riwayah], added))
            quarters.add(quarter);
        usage.set(week, quarters);
    }
    return usage;
}

// Used by the existing carry-forward algorithm: keep each daily portion intact,
// but defer it if its quarters would exceed that calendar week's allowance.
export function memorizationCapacity(
    usage: MemorizationUsage,
    verses: MemoryVerse[],
    timezone: string,
    limit: number,
) {
    const reserved = new Map(
        [...usage].map(([week, quarters]) => [week, new Set(quarters)]),
    );
    const byReference = new Map(
        verses.map((v) => [`${v.surahNumber}:${v.ayahNumber}`, v.quarter]),
    );
    type Batch = { done: boolean; remaining: string[] }[];
    const combined = (batch: Batch, day: string) => {
        const week = DateTime.fromISO(day, { zone: timezone })
            .startOf("week")
            .toISODate() as string;
        const quarters = new Set(reserved.get(week));
        const pending = new Set<number>();
        for (const item of batch.filter((item) => !item.done)) {
            for (const reference of item.remaining) {
                const quarter = byReference.get(reference);
                if (quarter !== undefined) pending.add(quarter);
            }
        }
        // Generated daily portions always fit their snapshot's weekly target.
        // Reject malformed data instead of searching endlessly for a fitting week.
        if (pending.size > limit)
            throw new Error("Memorization portion exceeds its weekly target.");
        for (const quarter of pending) quarters.add(quarter);
        return { week, quarters };
    };
    return {
        canSchedule: (batch: Batch, day: string) =>
            combined(batch, day).quarters.size <= limit,
        reserve: (batch: Batch, day: string) => {
            const { week, quarters } = combined(batch, day);
            reserved.set(week, quarters);
        },
    };
}
