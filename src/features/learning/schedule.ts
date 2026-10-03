import { DateTime } from "luxon";
import { z } from "zod";
import {
    isMemorized,
    type MemoryCatalogue,
    type MemoryVerse,
} from "@/features/memorization/progress";

export { isMemorized, memorizedAtoms } from "@/features/memorization/progress";

import type { ScheduledRange } from "@/features/revision/schedule";

const days = z
    .array(z.number().int().min(1).max(7))
    .max(7)
    .transform((values) => [...new Set(values)].sort((a, b) => a - b));
export const learningScheduleSchema = z.object({
    revisionDays: days,
    memorizationDays: days,
    revision: z.number().int().nonnegative(),
});
export const memorizationSettingsSchema = z.object({
    quartersPerWeek: z.number().int().min(1).max(28),
    direction: z.enum(["forward", "backward"]),
    timezone: z
        .string()
        .min(1)
        .max(100)
        .refine((zone) => DateTime.now().setZone(zone).isValid),
    riwayah: z.enum(["hafs", "warsh"]),
});
export type MemorizationSettings = z.infer<typeof memorizationSettingsSchema>;
export type LearningSchedule = z.infer<typeof learningScheduleSchema>;

export const MEMORIZATION_SEQUENCE_VERSION = 2;

function orderedVerses(
    verses: MemoryVerse[],
    direction: MemorizationSettings["direction"],
) {
    if (direction === "forward") return verses;
    const surahs = new Map<number, MemoryVerse[]>();
    for (const verse of verses) {
        const surah = surahs.get(verse.surahNumber) ?? [];
        surah.push(verse);
        surahs.set(verse.surahNumber, surah);
    }
    // Visit hizbs from last to first, reading forward inside each one. A surah
    // spanning a hizb boundary belongs to the last hizb it touches, so its earlier
    // ayahs are learned first and it cannot be split across reversed visits.
    // This order is independent of coverage: learning its tail elsewhere must
    // not push its missing beginning behind the next surah.
    return [...surahs.values()]
        .sort(
            (a, b) =>
                b[b.length - 1].hizb - a[a.length - 1].hizb ||
                a[0].surahNumber - b[0].surahNumber,
        )
        .flat();
}

// Follow the surah sequence within the weekly quarter budget, then distribute ayahs.
// Never credit a planned verse, split an ayah, or span already-memorized gaps.
export function generateMemorizationSchedule({
    catalogue,
    settings,
    days,
    covered,
    weekStart,
    fromDate,
    usedQuarters = new Set<number>(),
}: {
    catalogue: MemoryCatalogue;
    settings: MemorizationSettings;
    days: number[];
    covered: Set<string>;
    weekStart: string;
    fromDate: string;
    usedQuarters?: ReadonlySet<number>;
}): ScheduledRange[] {
    const verses = catalogue[settings.riwayah];
    const dates = Array.from({ length: 7 }, (_, i) =>
        DateTime.fromISO(weekStart, { zone: settings.timezone }).plus({
            days: i,
        }),
    )
        .filter(
            (d) =>
                days.includes(d.weekday) &&
                (d.toISODate() as string) >= fromDate,
        )
        .map((d) => d.toISODate() as string);
    if (!dates.length) return [];
    const allocated = new Set(usedQuarters);
    if (allocated.size > settings.quartersPerWeek) return [];
    const pending: MemoryVerse[] = [];
    for (const verse of orderedVerses(verses, settings.direction)) {
        if (isMemorized(verse, covered)) continue;
        // Stop at the first quarter that cannot fit. Skipping ahead to an already
        // budgeted later quarter would teach the surah's ending before its start.
        if (
            !allocated.has(verse.quarter) &&
            allocated.size >= settings.quartersPerWeek
        )
            break;
        allocated.add(verse.quarter);
        pending.push(verse);
    }
    const index = new Map(verses.map((v, i) => [v, i]));
    const result: ScheduledRange[] = [];
    let cursor = 0;
    for (const [i, scheduledDate] of dates.entries()) {
        const count =
            Math.floor(pending.length / dates.length) +
            (i < pending.length % dates.length ? 1 : 0);
        const daily = pending.slice(cursor, cursor + count);
        cursor += count;
        let previous: MemoryVerse | undefined;
        for (const verse of daily) {
            const last = result.at(-1);
            if (
                last?.scheduledDate === scheduledDate &&
                previous &&
                index.get(verse) === (index.get(previous) as number) + 1
            ) {
                last.endSurahNumber = verse.surahNumber;
                last.endAyahNumber = verse.ayahNumber;
                if (!last.quarters.includes(verse.quarter))
                    last.quarters.push(verse.quarter);
            } else
                result.push({
                    scheduledDate,
                    ordinal: result.length,
                    quarters: [verse.quarter],
                    startSurahNumber: verse.surahNumber,
                    startAyahNumber: verse.ayahNumber,
                    endSurahNumber: verse.surahNumber,
                    endAyahNumber: verse.ayahNumber,
                });
            previous = verse;
        }
    }
    return result;
}
