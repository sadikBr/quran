import { expect, test } from "bun:test";
import { calculateMeetingState } from "../src/features/groups/server/meeting-schedule";
import { getRevisionMeetingDate } from "../src/features/groups/server/revision-meeting";

test("manual closure ends only the selected occurrence", () => {
    const config = {
        enabled: true,
        timezone: "UTC",
        activeWindowMinutes: 180,
        schedule: [{ weekday: 2, localTime: "16:00" }],
        now: new Date("2026-09-29T17:00:00Z"),
    };
    expect(calculateMeetingState(config).status).toBe("active");
    const closed = calculateMeetingState({
        ...config,
        closedOccurrences: ["2026-09-29T16:00:00.000Z"],
    });
    expect(closed.status).toBe("upcoming");
    expect(closed.nextStartsAt).toBe("2026-10-06T16:00:00.000Z");
    expect(
        calculateMeetingState({
            ...config,
            closedOccurrences: ["2026-09-22T16:00:00.000Z"],
        }).status,
    ).toBe("active");
});

const meeting = {
    enabled: true,
    timezone: "Africa/Casablanca",
    schedule: [
        { weekday: 2, localTime: "16:00" },
        { weekday: 4, localTime: "16:00" },
    ],
};

test("revision moves from Tuesday to Thursday, not a full week later", () => {
    expect(
        getRevisionMeetingDate(
            meeting,
            new Date("2026-09-29T16:00:00Z"),
            new Date("2026-09-29T16:30:00Z"),
        )?.toISOString(),
    ).toBe("2026-10-01T16:00:00.000Z");
});
test("early review does not reuse the assignment's original meeting", () => {
    expect(
        getRevisionMeetingDate(
            meeting,
            new Date("2026-09-29T16:00:00Z"),
            new Date("2026-09-28T10:00:00Z"),
        )?.toISOString(),
    ).toBe("2026-10-01T16:00:00.000Z");
});
test("late review skips meetings already in the past", () => {
    expect(
        getRevisionMeetingDate(
            meeting,
            new Date("2026-09-29T16:00:00Z"),
            new Date("2026-10-02T10:00:00Z"),
        )?.toISOString(),
    ).toBe("2026-10-06T16:00:00.000Z");
});
test("missing or disabled schedules cannot reschedule", () => {
    for (const value of [
        null,
        { ...meeting, enabled: false },
        { ...meeting, schedule: [] },
    ]) {
        expect(getRevisionMeetingDate(value, null)).toBeNull();
    }
});
