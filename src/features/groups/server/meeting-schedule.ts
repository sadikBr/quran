import { DateTime, IANAZone } from "luxon";
import type {
    MeetingOccurrenceState,
    MeetingScheduleSlot,
} from "../meeting-types";

export function isValidTimezone(timezone: string) {
    return IANAZone.isValidZone(timezone);
}

const MOROCCO_STANDARD_TIME_START = new Date("2026-09-20T01:00:00Z");

export function getMeetingDisplayTimezone(timezone: string, instant: Date) {
    if (
        timezone === "Africa/Casablanca" &&
        instant >= MOROCCO_STANDARD_TIME_START
    ) {
        return "UTC";
    }

    return timezone;
}

function occurrenceForWeek(
    weekStart: DateTime,
    slot: MeetingScheduleSlot,
    timezone: string,
) {
    const [hour, minute] = slot.localTime.split(":").map(Number);
    const date = weekStart.plus({ days: slot.weekday - 1 });
    const zone =
        timezone === "Africa/Casablanca" &&
        (date.toISODate() ?? "") >= "2026-09-20"
            ? "UTC"
            : timezone;

    return DateTime.fromObject(
        {
            year: date.year,
            month: date.month,
            day: date.day,
            hour,
            minute,
            second: 0,
            millisecond: 0,
        },
        { zone },
    );
}

export function getUpcomingMeetingOccurrences({
    schedule,
    timezone,
    enabled,
    now = new Date(),
    limit = 12,
}: {
    schedule: MeetingScheduleSlot[];
    timezone: string;
    enabled: boolean;
    now?: Date;
    limit?: number;
}) {
    if (
        !enabled ||
        schedule.length === 0 ||
        !isValidTimezone(timezone) ||
        limit <= 0
    ) {
        return [];
    }

    const zonedNow = DateTime.fromJSDate(now, {
        zone: getMeetingDisplayTimezone(timezone, now),
    });
    const weekStart = zonedNow.startOf("week");
    const candidates = Array.from({ length: 13 }, (_, weekOffset) =>
        schedule.map((slot) =>
            occurrenceForWeek(
                weekStart.plus({ weeks: weekOffset }),
                slot,
                timezone,
            ),
        ),
    )
        .flat()
        .filter((candidate) => candidate > zonedNow)
        .sort((first, second) => first.toMillis() - second.toMillis());

    return [
        ...new Map(candidates.map((item) => [item.toMillis(), item])).values(),
    ]
        .slice(0, limit)
        .map((item) => item.toUTC().toISO())
        .filter((item): item is string => item !== null);
}

export function calculateMeetingState({
    schedule,
    timezone,
    activeWindowMinutes,
    closedOccurrences = [],
    enabled,
    now = new Date(),
}: {
    schedule: MeetingScheduleSlot[];
    timezone: string;
    activeWindowMinutes: number;
    closedOccurrences?: string[];
    enabled: boolean;
    now?: Date;
}): MeetingOccurrenceState {
    if (!enabled || schedule.length === 0 || !isValidTimezone(timezone)) {
        return {
            status: "disabled",
            activeStartsAt: null,
            activeEndsAt: null,
            nextStartsAt: null,
        };
    }

    const zonedNow = DateTime.fromJSDate(now, {
        zone: getMeetingDisplayTimezone(timezone, now),
    });
    const weekStart = zonedNow.startOf("week");
    const candidates = schedule.flatMap((slot) => {
        return [-1, 0, 1].map((weekOffset) =>
            occurrenceForWeek(
                weekStart.plus({ weeks: weekOffset }),
                slot,
                timezone,
            ),
        );
    });

    const active = candidates
        .filter((candidate) => {
            const endsAt = candidate.plus({ minutes: activeWindowMinutes });
            return (
                candidate <= zonedNow &&
                zonedNow < endsAt &&
                !closedOccurrences.some(
                    (value) =>
                        new Date(value).getTime() === candidate.toMillis(),
                )
            );
        })
        .sort((a, b) => b.toMillis() - a.toMillis())[0];

    if (active) {
        return {
            status: "active",
            activeStartsAt: active.toUTC().toISO(),
            activeEndsAt: active
                .plus({ minutes: activeWindowMinutes })
                .toUTC()
                .toISO(),
            nextStartsAt: null,
        };
    }

    const next = candidates
        .filter((candidate) => candidate > zonedNow)
        .sort((a, b) => a.toMillis() - b.toMillis())[0];

    return {
        status: "upcoming",
        activeStartsAt: null,
        activeEndsAt: null,
        nextStartsAt: next?.toUTC().toISO() ?? null,
    };
}
