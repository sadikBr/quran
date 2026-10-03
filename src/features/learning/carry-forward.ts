import { DateTime } from "luxon";

type Session = {
    scheduledDate: string;
    completedAt: Date | string | null;
    done: boolean;
    available?: boolean;
};

/** Reader access follows the projected date in the saved plan's own time zone. */
export function isActivePlanSession(
    session: {
        scheduledDate: string | null;
        done: boolean;
        available?: boolean;
    },
    today: string,
    enabled: boolean,
) {
    return (
        enabled &&
        session.scheduledDate === today &&
        !session.done &&
        session.available !== false
    );
}

/** Move whole daily portions, keeping saved ranges, IDs and progress intact. */
export function carryForwardSessions<T extends Session>(
    sessions: T[],
    today: string,
    days: number[],
    timezone: string,
    originalDays: number[] = days,
    capacity?: {
        canSchedule: (batch: T[], day: string) => boolean;
        reserve: (batch: T[], day: string) => void;
    },
): (Omit<T, "scheduledDate"> & {
    scheduledDate: string | null;
    originalScheduledDate: string;
})[] {
    const selected = new Set(days.filter((day) => day >= 1 && day <= 7));
    const daysChanged =
        selected.size !== new Set(originalDays).size ||
        originalDays.some((day) => !selected.has(day));
    const completedDate = (session: Session) =>
        session.completedAt
            ? DateTime.fromJSDate(new Date(session.completedAt), {
                  zone: timezone,
              }).toISODate()
            : null;
    const occupied = new Map<string, Set<string>>();
    for (const session of sessions) {
        const day = completedDate(session);
        if (!day) continue;
        const batches = occupied.get(day) ?? new Set<string>();
        batches.add(session.scheduledDate);
        occupied.set(day, batches);
    }
    const result: (Omit<T, "scheduledDate"> & {
        scheduledDate: string | null;
        originalScheduledDate: string;
    })[] = [];
    let cursor = today;
    const batchDates = [
        ...new Set(sessions.map((s) => s.scheduledDate)),
    ].sort();
    for (const originalDate of batchDates) {
        const batch = sessions.filter((s) => s.scheduledDate === originalDate);
        let scheduledDate: string | null = originalDate;
        if (batch.some((s) => !s.done && s.available !== false)) {
            if (!selected.size) scheduledDate = null;
            else {
                let day = DateTime.fromISO(
                    [today, cursor, ...(daysChanged ? [] : [originalDate])]
                        .sort()
                        .at(-1) as string,
                    { zone: timezone },
                );
                while (
                    !selected.has(day.weekday) ||
                    [...(occupied.get(day.toISODate() as string) ?? [])].some(
                        (date) => date !== originalDate,
                    ) ||
                    (capacity &&
                        !capacity.canSchedule(batch, day.toISODate() as string))
                )
                    day = day.plus({ days: 1 });
                scheduledDate = day.toISODate() as string;
                capacity?.reserve(batch, scheduledDate);
                cursor = day.plus({ days: 1 }).toISODate() as string;
            }
        }
        for (const session of batch)
            result.push({
                ...session,
                originalScheduledDate: originalDate,
                scheduledDate:
                    session.done || session.available === false
                        ? (completedDate(session) ?? originalDate)
                        : scheduledDate,
            });
    }
    return result;
}

/** A fresh batch starts after the saved batch's week and its remaining portions. */
export function nextPlanStart(
    weekStart: string,
    sessions: { scheduledDate: string | null }[],
    timezone: string,
) {
    const nextWeek = DateTime.fromISO(weekStart, { zone: timezone })
        .plus({ weeks: 1 })
        .toISODate() as string;
    const lastDate = sessions
        .map((s) => s.scheduledDate)
        .filter((date): date is string => date !== null)
        .sort()
        .at(-1);
    const afterLast = lastDate
        ? (DateTime.fromISO(lastDate, { zone: timezone })
              .plus({ days: 1 })
              .toISODate() as string)
        : nextWeek;
    return nextWeek > afterLast ? nextWeek : afterLast;
}
