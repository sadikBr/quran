import { DateTime } from "luxon";
import { z } from "zod";
import {
    type Assessment,
    assessmentVerses,
    isMemorized,
    type MemoryCatalogue,
    type MemoryVerse,
    type Riwayah,
} from "@/features/memorization/progress";

export const revisionSettingsSchema = z.object({
    days: z
        .array(z.number().int().min(1).max(7))
        .min(1)
        .max(7)
        .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    quartersPerDay: z.union([z.literal(1), z.literal(2), z.literal(4)]),
    timezone: z
        .string()
        .min(1)
        .max(100)
        .refine((zone) => DateTime.now().setZone(zone).isValid),
    riwayah: z.enum(["hafs", "warsh"]),
    reminderTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .nullable(),
});
export type RevisionSettings = z.infer<typeof revisionSettingsSchema>;
export type RevisionRange = Pick<
    Assessment,
    "startSurahNumber" | "startAyahNumber" | "endSurahNumber" | "endAyahNumber"
>;
export type ScheduledRange = RevisionRange & {
    scheduledDate: string;
    quarters: number[];
    ordinal: number;
};
export type RevisionHistory = ScheduledRange & {
    riwayah: Riwayah;
    weekStart: string;
    timezone: string;
    completedAt: Date | null;
    outcome: "comfortable" | "difficult" | null;
};
export const verseKey = (
    verse: Pick<MemoryVerse, "surahNumber" | "ayahNumber">,
) => `${verse.surahNumber}:${verse.ayahNumber}`;
export function weekCalendar(now: Date, timezone: string) {
    const local = DateTime.fromJSDate(now, { zone: timezone });
    if (!local.isValid) throw new Error("Invalid revision timezone.");
    return {
        today: local.toISODate() as string,
        weekStart: local.startOf("week").toISODate() as string,
    };
}
export function weekBounds(weekStart: string, timezone: string) {
    const start = DateTime.fromISO(weekStart, { zone: timezone }).startOf(
        "day",
    );
    return {
        start: start.toMillis(),
        end: start.plus({ weeks: 1 }).toMillis(),
    };
}
export function revisionWeekEnd(
    weekStart: string,
    timezone: string,
    nextTimezone: string,
) {
    // Moving west can leave the new timezone on Sunday after the saved week ends.
    // Keep that saved week usable until Monday in both zones, without creating it twice.
    return Math.max(
        weekBounds(weekStart, timezone).end,
        weekBounds(weekStart, nextTimezone).end,
    );
}
export function weekPeerAtoms(
    catalogue: MemoryCatalogue,
    assessments: Assessment[],
    weekStart: string,
    timezone: string,
    through?: Date,
) {
    const { start, end } = weekBounds(weekStart, timezone);
    const creditEnd = Math.max(end, through ? +through + 1 : end);
    return new Set(
        assessments
            .filter(
                (a) =>
                    a.method === "peer" &&
                    a.outcome === "confirmed" &&
                    +a.createdAt >= start &&
                    +a.createdAt < creditEnd,
            )
            .flatMap((a) =>
                assessmentVerses(catalogue, a).flatMap((v) => v.atoms),
            ),
    );
}
export function revisionCoverage(
    catalogue: MemoryCatalogue,
    range: RevisionRange & { riwayah: Riwayah; completedAt: Date | null },
    peer: Set<string>,
) {
    const verses = assessmentVerses(catalogue, range);
    const remaining = verses.filter(
        (v) => !v.atoms.every((atom) => peer.has(atom)),
    );
    return {
        total: verses.length,
        peer: verses.length - remaining.length,
        remaining,
        done: Boolean(range.completedAt) || remaining.length === 0,
    };
}
export function generateRevisionSchedule({
    catalogue,
    settings,
    completedHizbs,
    covered,
    assessments,
    history,
    weekStart,
    fromDate,
    reviewed = new Set<string>(),
    dailyCapacity = settings.quartersPerDay,
}: {
    catalogue: MemoryCatalogue;
    settings: RevisionSettings;
    completedHizbs: number[];
    covered?: Set<string>;
    assessments: Assessment[];
    history: RevisionHistory[];
    weekStart: string;
    fromDate: string;
    reviewed?: Set<string>;
    /** Remaining slots when repairing an existing day, after retained sessions. */
    dailyCapacity?: number;
}): ScheduledRange[] {
    const verses = catalogue[settings.riwayah];
    const eligibleByQuarter = new Map<number, MemoryVerse[]>();
    for (const verse of verses) {
        if (
            covered
                ? !isMemorized(verse, covered)
                : !completedHizbs.includes(verse.hizb)
        )
            continue;
        const part = eligibleByQuarter.get(verse.quarter) ?? [];
        part.push(verse);
        eligibleByQuarter.set(verse.quarter, part);
    }
    const latest = new Map<string, { time: number; difficult: boolean }>();
    for (const a of [...assessments].sort(
        (a, b) => +a.createdAt - +b.createdAt || a.id.localeCompare(b.id),
    )) {
        for (const v of assessmentVerses(catalogue, a))
            for (const atom of v.atoms)
                latest.set(atom, {
                    time: +a.createdAt,
                    difficult: a.outcome === "needs_revision",
                });
    }
    const scheduled = new Map<string, number>();
    for (const old of [...history].sort((a, b) =>
        a.scheduledDate.localeCompare(b.scheduledDate),
    )) {
        if (old.weekStart >= weekStart) continue;
        for (const v of assessmentVerses(catalogue, old))
            for (const atom of v.atoms)
                scheduled.set(
                    atom,
                    DateTime.fromISO(old.scheduledDate, {
                        zone: old.timezone,
                    }).toMillis(),
                );
    }
    const units = Array.from({ length: 240 }, (_, i) => i + 1)
        .map((quarter) => {
            const part = eligibleByQuarter.get(quarter) ?? [];
            const atoms = part.flatMap((v) => v.atoms);
            return {
                quarter,
                part,
                urgent: atoms.some((a) => latest.get(a)?.difficult),
                last: Math.max(
                    Math.min(...atoms.map((a) => latest.get(a)?.time ?? 0)),
                    0,
                    ...atoms.map((a) => scheduled.get(a) ?? 0),
                ),
            };
        })
        .filter(
            (u) =>
                u.part.length > 0 &&
                !u.part.every((v) =>
                    v.atoms.every((atom) => reviewed.has(atom)),
                ),
        );
    const dates = Array.from({ length: 7 }, (_, i) =>
        DateTime.fromISO(weekStart, { zone: settings.timezone }).plus({
            days: i,
        }),
    )
        .filter(
            (day) =>
                settings.days.includes(day.weekday) &&
                (day.toISODate() as string) >= fromDate,
        )
        .map((day) => day.toISODate() as string);
    const capacity = dates.length * dailyCapacity;
    // Unfinished sessions keep their existing queue. New batches balance difficult passages and rotation.
    const quota =
        capacity === 1
            ? DateTime.fromISO(weekStart).weekNumber % 2
            : Math.floor(capacity / 2);
    const ranked = [...units].sort(
        (a, b) => a.last - b.last || a.quarter - b.quarter,
    );
    const chosen = ranked.filter((u) => u.urgent).slice(0, quota);
    const picked = new Set(chosen.map((u) => u.quarter));
    chosen.push(
        ...ranked
            .filter((u) => !picked.has(u.quarter))
            .slice(0, capacity - chosen.length),
    );
    const result: ScheduledRange[] = [];
    const positions = new Map(verses.map((v, index) => [verseKey(v), index]));
    for (const [i, day] of dates.entries()) {
        const daily = chosen
            .slice(i * dailyCapacity, (i + 1) * dailyCapacity)
            .sort((a, b) => a.quarter - b.quarter);
        for (const unit of daily) {
            // Keep disjoint memorized passages separate, even inside the same quarter.
            const runs: MemoryVerse[][] = [];
            for (const verse of unit.part) {
                const run = runs.at(-1);
                const previousVerse = run?.at(-1);
                if (
                    previousVerse &&
                    positions.get(verseKey(verse)) ===
                        (positions.get(verseKey(previousVerse)) ?? -2) + 1
                )
                    run?.push(verse);
                else runs.push([verse]);
            }
            for (const run of runs) {
                const first = run[0],
                    last = run[run.length - 1];
                const previous = result.at(-1);
                if (
                    previous?.scheduledDate === day &&
                    previous.quarters.at(-1) === unit.quarter - 1 &&
                    positions.get(verseKey(first)) ===
                        (positions.get(
                            `${previous.endSurahNumber}:${previous.endAyahNumber}`,
                        ) ?? -2) +
                            1
                ) {
                    previous.quarters.push(unit.quarter);
                    previous.endSurahNumber = last.surahNumber;
                    previous.endAyahNumber = last.ayahNumber;
                } else
                    result.push({
                        scheduledDate: day,
                        ordinal: result.length,
                        quarters: [unit.quarter],
                        startSurahNumber: first.surahNumber,
                        startAyahNumber: first.ayahNumber,
                        endSurahNumber: last.surahNumber,
                        endAyahNumber: last.ayahNumber,
                    });
            }
        }
    }
    return result;
}
export function dueRevisionDate(
    time: string | null,
    timezone: string,
    now: Date,
) {
    if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    const local = DateTime.fromJSDate(now, { zone: timezone });
    if (!local.isValid) return null;
    const [hour, minute] = time.split(":").map(Number);
    const scheduled = local.set({ hour, minute, second: 0, millisecond: 0 });
    const elapsed = local.toMillis() - scheduled.toMillis();
    return elapsed >= 0 && elapsed < 30 * 60_000 ? local.toISODate() : null;
}
