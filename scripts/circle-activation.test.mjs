import { expect, test } from "bun:test";
import {
    calculateMeetingState,
    getUpcomingMeetingOccurrences,
} from "../src/features/groups/server/meeting-schedule";

const meeting = {
    enabled: true,
    timezone: "UTC",
    activeWindowMinutes: 180,
    schedule: [{ weekday: 4, localTime: "20:00" }],
    now: new Date("2026-10-01T20:30:00Z"),
};

test("inactive groups have no live or upcoming workflow, even with a configured schedule", () => {
    expect(
        calculateMeetingState({ ...meeting, groupActive: false }).status,
    ).toBe("disabled");
    expect(
        getUpcomingMeetingOccurrences({ ...meeting, groupActive: false }),
    ).toEqual([]);
});

test("activation midway through a scheduled window starts with the next meeting", () => {
    const config = {
        ...meeting,
        groupActive: true,
        activeSince: new Date("2026-10-01T20:15:00Z"),
    };
    expect(calculateMeetingState(config).status).toBe("upcoming");
    expect(calculateMeetingState(config).nextStartsAt).toBe(
        "2026-10-08T20:00:00.000Z",
    );
    expect(
        calculateMeetingState({
            ...config,
            now: new Date("2026-10-08T20:30:00Z"),
        }).status,
    ).toBe("active");
});

test("existing active groups retain their current meeting", () => {
    expect(
        calculateMeetingState({
            ...meeting,
            groupActive: true,
            activeSince: null,
        }).status,
    ).toBe("active");
});

test("resuming skips a prepared occurrence cancelled during deactivation", () => {
    const config = {
        ...meeting,
        now: new Date("2026-10-01T19:00:00Z"),
        activeSince: new Date("2026-10-01T18:00:00Z"),
        closedOccurrences: ["2026-10-01T20:00:00Z"],
    };
    expect(getUpcomingMeetingOccurrences({ ...config, limit: 1 })).toEqual([
        "2026-10-08T20:00:00.000Z",
    ]);
    expect(calculateMeetingState(config).nextStartsAt).toBe(
        "2026-10-08T20:00:00.000Z",
    );
});

test("rescheduled occurrences also respect activation time", () => {
    expect(
        calculateMeetingState({
            ...meeting,
            activeSince: new Date("2026-10-01T20:15:00Z"),
            rescheduledOccurrences: [
                { from: "2026-10-08T20:00:00Z", to: "2026-10-01T20:10:00Z" },
            ],
        }).status,
    ).toBe("upcoming");
});
