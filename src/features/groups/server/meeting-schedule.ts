import { DateTime, IANAZone } from "luxon";
import type {
    MeetingOccurrenceState,
    MeetingScheduleSlot,
} from "../meeting-types";

export function isValidTimezone(timezone: string) {
    return IANAZone.isValidZone(timezone);
}

const MOROCCO_STANDARD_TIME_START = new Date("2026-09-20T01:00:00Z");

function calculationZone(timezone: string, instant: Date) {
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

export function calculateMeetingState({
    schedule,
    timezone,
    activeWindowMinutes,
    enabled,
    now = new Date(),
}: {
    schedule: MeetingScheduleSlot[];
    timezone: string;
    activeWindowMinutes: number;
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
        zone: calculationZone(timezone, now),
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
            return candidate <= zonedNow && zonedNow < endsAt;
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
