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
    startQuarter: z.number().int().min(1).max(240),
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

// Select native quarter boundaries, then distribute their unmemorized ayahs across days.
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
    const quarters = Array.from({ length: 240 }, (_, i) => i + 1).filter((q) =>
        settings.direction === "forward"
            ? q >= settings.startQuarter
            : q <= settings.startQuarter,
    );
    if (settings.direction === "backward") quarters.reverse();
    const allocated = new Set(usedQuarters);
    if (allocated.size > settings.quartersPerWeek) return [];
    const selected = quarters.filter((q) => {
        if (!verses.some((v) => v.quarter === q && !isMemorized(v, covered)))
            return false;
        if (!allocated.has(q) && allocated.size >= settings.quartersPerWeek)
            return false;
        allocated.add(q);
        return true;
    });
    const pending = selected.flatMap((q) =>
        verses.filter((v) => v.quarter === q && !isMemorized(v, covered)),
    );
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
