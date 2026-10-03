import { DateTime } from "luxon";
import { nextPlanStart } from "@/features/learning/carry-forward";
import {
    type Assessment,
    assessmentVerses,
    isMemorized,
    type MemoryCatalogue,
    type Riwayah,
} from "@/features/memorization/progress";
import {
    generateRevisionSchedule,
    type RevisionHistory,
    type RevisionSettings,
    type ScheduledRange,
} from "./schedule";

type CurrentBatch = {
    weekStart: string;
    timezone: string;
    riwayah: Riwayah;
    sessions: (Omit<ScheduledRange, "scheduledDate"> & {
        scheduledDate: string | null;
    })[];
};

/** A read-only forecast of one complete pass through the currently memorized ayahs. */
export function buildRevisionRotation({
    catalogue,
    settings,
    covered,
    assessments,
    history,
    current,
    today,
}: {
    catalogue: MemoryCatalogue;
    settings: RevisionSettings;
    covered: Set<string>;
    assessments: Assessment[];
    history: RevisionHistory[];
    current?: CurrentBatch;
    today: string;
}) {
    const verses = catalogue[settings.riwayah].filter((v) =>
        isMemorized(v, covered),
    );
    const scheduled = new Set(
        current?.sessions.flatMap((session) =>
            assessmentVerses(catalogue, {
                ...session,
                riwayah: current.riwayah,
            }).flatMap((v) => v.atoms),
        ),
    );
    const remainingVerses = verses.filter((v) => !isMemorized(v, scheduled));
    const remaining = new Set(remainingVerses.flatMap((v) => v.atoms));
    const hizbs = [...new Set(verses.map((v) => v.hizb))].map((number) => {
        const part = verses.filter((v) => v.hizb === number);
        return {
            number,
            ayahs: part.length,
            scheduledAyahs: part.filter((v) => isMemorized(v, scheduled))
                .length,
            nextDate: null as string | null,
        };
    });
    const weeks: {
        weekStart: string;
        sessions: (ScheduledRange & { ayahs: number })[];
    }[] = [];
    let fromDate = current
        ? nextPlanStart(current.weekStart, current.sessions, current.timezone)
        : today;
    if (fromDate < today) fromDate = today;
    let weekStart = DateTime.fromISO(fromDate, { zone: settings.timezone })
        .startOf("week")
        .toISODate() as string;
    // There are at most 240 native quarters. Each full week consumes at least one.
    if (settings.days.length)
        for (let i = 0; remaining.size && i <= 240; i++) {
            const sessions = generateRevisionSchedule({
                catalogue,
                settings,
                covered: remaining,
                completedHizbs: [],
                assessments,
                history,
                weekStart,
                fromDate,
            });
            if (sessions.length) {
                weeks.push({
                    weekStart,
                    sessions: sessions.map((session) => {
                        const part = assessmentVerses(catalogue, {
                            ...session,
                            riwayah: settings.riwayah,
                        });
                        for (const verse of part) {
                            for (const atom of verse.atoms)
                                remaining.delete(atom);
                            const hizb = hizbs.find(
                                (h) => h.number === verse.hizb,
                            );
                            if (hizb && !hizb.nextDate)
                                hizb.nextDate = session.scheduledDate;
                        }
                        return { ...session, ayahs: part.length };
                    }),
                });
            }
            weekStart = DateTime.fromISO(weekStart, { zone: settings.timezone })
                .plus({ weeks: 1 })
                .toISODate() as string;
            fromDate = weekStart;
        }
    return {
        riwayah: settings.riwayah,
        totalAyahs: verses.length,
        scheduledAyahs: verses.length - remainingVerses.length,
        remainingAyahs: remainingVerses.length,
        hizbs,
        weeks,
    };
}
export type RevisionRotation = ReturnType<typeof buildRevisionRotation>;
