import { DateTime } from "luxon";
import {
    type Assessment,
    assessmentVerses,
    type MemoryCatalogue,
} from "@/features/memorization/progress";
import {
    generateRevisionSchedule,
    type RevisionHistory,
    type RevisionSettings,
    type ScheduledRange,
} from "@/features/revision/schedule";
import type { FollowUp } from "./activity";

type Session = ScheduledRange & {
    id: string;
    completedAt: Date | null;
    progressSurahNumber: number | null;
    progressAyahNumber: number | null;
    projectedDate: string | null;
    done: boolean;
};

/** Refresh unstarted portions and unused study days without increasing the daily allowance. */
export function refreshFollowUpSessions({
    catalogue,
    settings,
    sessions,
    covered,
    assessments,
    history,
    followUps,
    additionalDays = [],
}: {
    catalogue: MemoryCatalogue;
    settings: RevisionSettings;
    sessions: Session[];
    covered: Set<string>;
    assessments: Assessment[];
    history: RevisionHistory[];
    followUps: Map<string, FollowUp>;
    /** Unused study days in the current saved week; no overdue weeks are accumulated. */
    additionalDays?: string[];
}) {
    const dates = [
        ...new Set([
            ...sessions.map((s) => s.scheduledDate),
            ...additionalDays,
        ]),
    ].sort();
    const capacity = dates.reduce(
        (n, date) =>
            n +
            (sessions.some((s) => s.scheduledDate === date)
                ? new Set(
                      sessions
                          .filter((s) => s.scheduledDate === date)
                          .flatMap((s) => s.quarters),
                  ).size
                : settings.quartersPerDay),
        0,
    );
    const firstDay = sessions
        .map((s) => s.projectedDate)
        .filter((s): s is string => s !== null)
        .sort()[0];
    let quota =
        capacity === 1 && firstDay
            ? DateTime.fromISO(firstDay).weekNumber % 2
            : Math.floor(capacity / 2);
    const reserved = new Set<string>();
    const pendingFollowUps = new Map(followUps);
    const removed: string[] = [];
    const replacements: ScheduledRange[] = [];
    const atoms = (s: ScheduledRange) =>
        assessmentVerses(catalogue, {
            ...s,
            riwayah: settings.riwayah,
        }).flatMap((v) => v.atoms);
    const frozen = (batch: Session[]) =>
        batch.some(
            (s) =>
                s.done ||
                s.completedAt ||
                s.progressSurahNumber !== null ||
                s.projectedDate === null,
        );
    // Reserve frozen portions before choosing replacements, even if their dates are later.
    for (const date of dates) {
        const batch = sessions.filter((s) => s.scheduledDate === date);
        if (!frozen(batch)) continue;
        quota -= new Set(
            batch.filter((s) => s.reviewAfter).flatMap((s) => s.quarters),
        ).size;
        for (const s of batch)
            for (const atom of atoms(s)) {
                reserved.add(atom);
                // Completed reviews can earn a subsequent follow-up; unfinished ones cannot.
                if (!s.done) pendingFollowUps.delete(atom);
            }
    }
    const signature = (rows: ScheduledRange[]) =>
        JSON.stringify(
            rows
                .map((s) => [
                    s.startSurahNumber,
                    s.startAyahNumber,
                    s.endSurahNumber,
                    s.endAyahNumber,
                    s.quarters,
                    s.reviewAfter ?? null,
                ])
                .sort((a, b) =>
                    JSON.stringify(a).localeCompare(JSON.stringify(b)),
                ),
        );
    for (const date of dates) {
        const batch = sessions.filter((s) => s.scheduledDate === date);
        if (frozen(batch)) continue;
        const projectedDate = batch[0]?.projectedDate ?? date;
        const day = DateTime.fromISO(projectedDate, {
            zone: settings.timezone,
        });
        const generated = generateRevisionSchedule({
            catalogue,
            settings: { ...settings, days: [day.weekday] },
            dailyCapacity: Math.min(
                settings.quartersPerDay,
                batch.length
                    ? new Set(batch.flatMap((s) => s.quarters)).size
                    : settings.quartersPerDay,
            ),
            completedHizbs: [],
            covered,
            assessments,
            history,
            weekStart: day.startOf("week").toISODate() as string,
            fromDate: projectedDate,
            reviewed: reserved,
            followUps: pendingFollowUps,
            followUpCapacity: Math.max(0, quota),
        }).map((s) => ({ ...s, scheduledDate: date }));
        // No evidence of a follow-up change: leave the existing rotation stable.
        const needsChange =
            batch.some((s) => s.reviewAfter) ||
            generated.some((s) => s.reviewAfter);
        const selected = needsChange && generated.length ? generated : batch;
        if (signature(selected) !== signature(batch)) {
            removed.push(...batch.map((s) => s.id));
            replacements.push(...selected);
        }
        quota -= new Set(
            selected.filter((s) => s.reviewAfter).flatMap((s) => s.quarters),
        ).size;
        for (const s of selected)
            for (const atom of atoms(s)) {
                reserved.add(atom);
                pendingFollowUps.delete(atom);
            }
    }
    const ordinal = Math.max(-1, ...sessions.map((s) => s.ordinal)) + 1;
    return {
        removed,
        replacements: replacements.map((s, i) => ({
            ...s,
            ordinal: ordinal + i,
        })),
    };
}
