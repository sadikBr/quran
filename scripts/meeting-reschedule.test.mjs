import { expect, test } from "bun:test";
import {
    calculateMeetingState,
    getUpcomingMeetingOccurrences,
} from "../src/features/groups/server/meeting-schedule";
import { getRevisionMeetingDate } from "../src/features/groups/server/revision-meeting";

const config = {
    enabled: true,
    timezone: "UTC",
    activeWindowMinutes: 180,
    schedule: [{ weekday: 3, localTime: "20:00" }],
    rescheduledOccurrences: [
        { from: "2026-10-07T20:00:00.000Z", to: "2026-10-09T18:00:00.000Z" },
    ],
};
test("moving one occurrence removes its old time, keeps following weekly meetings", () => {
    expect(
        getUpcomingMeetingOccurrences({
            ...config,
            now: new Date("2026-10-01"),
            limit: 3,
        }),
    ).toEqual([
        "2026-10-09T18:00:00.000Z",
        "2026-10-14T20:00:00.000Z",
        "2026-10-21T20:00:00.000Z",
    ]);
    expect(
        calculateMeetingState({
            ...config,
            now: new Date("2026-10-07T20:30:00Z"),
        }).status,
    ).toBe("upcoming");
    expect(
        calculateMeetingState({
            ...config,
            now: new Date("2026-10-09T18:30:00Z"),
        }).activeStartsAt,
    ).toBe("2026-10-09T18:00:00.000Z");
});
test("an earlier replacement and a replacement weeks later are both discoverable", () => {
    for (const to of ["2026-10-02T18:00:00.000Z", "2026-11-20T18:00:00.000Z"]) {
        const meeting = {
            ...config,
            rescheduledOccurrences: [
                { from: config.rescheduledOccurrences[0].from, to },
            ],
        };
        expect(
            getUpcomingMeetingOccurrences({
                ...meeting,
                now: new Date("2026-10-01"),
                limit: 12,
            }),
        ).toContain(to);
        expect(
            calculateMeetingState({
                ...meeting,
                now: new Date(new Date(to).getTime() + 60000),
            }).status,
        ).toBe("active");
    }
});
test("revision and closed-meeting handling use the replacement time", () => {
    expect(
        getRevisionMeetingDate(
            config,
            new Date("2026-10-01"),
            new Date("2026-10-01"),
        )?.toISOString(),
    ).toBe("2026-10-09T18:00:00.000Z");
    expect(
        calculateMeetingState({
            ...config,
            now: new Date("2026-10-09T19:00:00Z"),
            closedOccurrences: [config.rescheduledOccurrences[0].to],
        }).nextStartsAt,
    ).toBe("2026-10-14T20:00:00.000Z");
});
