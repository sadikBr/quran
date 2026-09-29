import { DateTime } from "luxon";

// A short catch-up window tolerates scheduler delays without sending stale alerts.
export function dueAdhkarDate(
    time: string | null,
    timezone: string,
    now: Date,
): string | null {
    if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    const local = DateTime.fromJSDate(now, { zone: timezone });
    if (!local.isValid) return null;
    const [hour, minute] = time.split(":").map(Number);
    for (const day of [local, local.minus({ days: 1 })]) {
        const scheduled = day.set({ hour, minute, second: 0, millisecond: 0 });
        const elapsed = local.toMillis() - scheduled.toMillis();
        if (elapsed >= 0 && elapsed < 10 * 60_000) return scheduled.toISODate();
    }
    return null;
}
