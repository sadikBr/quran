import assert from "node:assert/strict";
import test from "node:test";
import { dueAdhkarDate } from "../src/features/adhkar/reminder-schedule.ts";

test("disabled and invalid reminders never run", () => {
    const now = new Date("2026-09-29T06:00:00Z");
    for (const time of [null, "", "24:00", "7:00", "12:60"])
        assert.equal(dueAdhkarDate(time, "Africa/Casablanca", now), null);
    assert.equal(dueAdhkarDate("07:00", "not-a-zone", now), null);
});
test("due at selected local time, not before or after the catch-up window", () => {
    assert.equal(
        dueAdhkarDate(
            "07:00",
            "Africa/Casablanca",
            new Date("2026-09-29T05:59:59Z"),
        ),
        null,
    );
    assert.equal(
        dueAdhkarDate(
            "07:00",
            "Africa/Casablanca",
            new Date("2026-09-29T06:00:00Z"),
        ),
        "2026-09-29",
    );
    assert.equal(
        dueAdhkarDate(
            "07:00",
            "Africa/Casablanca",
            new Date("2026-09-29T06:09:59Z"),
        ),
        "2026-09-29",
    );
    assert.equal(
        dueAdhkarDate(
            "07:00",
            "Africa/Casablanca",
            new Date("2026-09-29T06:10:00Z"),
        ),
        null,
    );
});
test("midnight catch-up retains the preceding local date", () => {
    assert.equal(
        dueAdhkarDate("23:58", "UTC", new Date("2026-09-30T00:03:00Z")),
        "2026-09-29",
    );
});
test("timezones with fractional offsets work", () => {
    assert.equal(
        dueAdhkarDate(
            "07:00",
            "Asia/Kolkata",
            new Date("2026-09-29T01:30:00Z"),
        ),
        "2026-09-29",
    );
});
test("spring-forward gaps shift forward; repeated hours share one daily key", () => {
    assert.equal(
        dueAdhkarDate(
            "02:30",
            "America/New_York",
            new Date("2026-03-08T07:30:00Z"),
        ),
        "2026-03-08",
    );
    assert.equal(
        dueAdhkarDate(
            "01:30",
            "America/New_York",
            new Date("2026-11-01T05:30:00Z"),
        ),
        "2026-11-01",
    );
    assert.equal(
        dueAdhkarDate(
            "01:30",
            "America/New_York",
            new Date("2026-11-01T06:30:00Z"),
        ),
        "2026-11-01",
    );
});
