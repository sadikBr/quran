import { expect, test } from "bun:test";
import {
    carryForwardSessions,
    nextPlanStart,
} from "../src/features/learning/carry-forward";

const session = (id, scheduledDate, extra = {}) => ({
    id,
    scheduledDate,
    done: false,
    completedAt: null,
    ...extra,
});
const queue = [
    session("fri", "2026-10-02"),
    session("sat", "2026-10-03"),
    session("sun", "2026-10-04"),
];
const allDays = [1, 2, 3, 4, 5, 6, 7];

test("a missed day shifts daily portions without adding work to today", () => {
    const rows = carryForwardSessions(queue, "2026-10-03", allDays, "UTC");
    expect(rows.map((s) => s.scheduledDate)).toEqual([
        "2026-10-03",
        "2026-10-04",
        "2026-10-05",
    ]);
    expect(rows[0].originalScheduledDate).toBe("2026-10-02");
    expect(queue[0].scheduledDate).toBe("2026-10-02");
    expect(carryForwardSessions(queue, "2026-10-03", allDays, "UTC")).toEqual(
        rows,
    );
});
test("multiple missed days and week boundaries keep the same IDs and selected days", () => {
    const rows = carryForwardSessions(
        queue,
        "2026-10-18",
        [1, 3, 5],
        "Africa/Casablanca",
    );
    expect(rows.map((s) => s.scheduledDate)).toEqual([
        "2026-10-19",
        "2026-10-21",
        "2026-10-23",
    ]);
    expect(rows.map((s) => s.id)).toEqual(["fri", "sat", "sun"]);
});
test("partial progress and split daily ranges stay together", () => {
    const rows = carryForwardSessions(
        [
            session("a", "2026-10-02", {
                progressAyahNumber: 4,
                peer: 7,
                remaining: ["2:8"],
            }),
            session("b", "2026-10-02"),
            session("c", "2026-10-03"),
        ],
        "2026-10-03",
        allDays,
        "UTC",
    );
    expect(rows.map((s) => s.scheduledDate)).toEqual([
        "2026-10-03",
        "2026-10-03",
        "2026-10-04",
    ]);
    expect(rows[0].progressAyahNumber).toBe(4);
    expect(rows[0].peer).toBe(7);
    expect(rows[0].remaining).toEqual(["2:8"]);
});
test("finishing a carried portion today does not pull tomorrow's portion into today", () => {
    const rows = carryForwardSessions(
        [
            { ...queue[0], done: true, completedAt: "2026-10-03T10:00:00Z" },
            ...queue.slice(1),
        ],
        "2026-10-03",
        allDays,
        "UTC",
    );
    expect(rows.map((s) => s.scheduledDate)).toEqual([
        "2026-10-03",
        "2026-10-04",
        "2026-10-05",
    ]);
});
test("partially completed daily portions may finish today without stacking another day's work", () => {
    const rows = carryForwardSessions(
        [
            session("a", "2026-10-02", {
                done: true,
                completedAt: "2026-10-03T10:00:00Z",
            }),
            session("b", "2026-10-02"),
            session("c", "2026-10-03"),
        ],
        "2026-10-03",
        allDays,
        "UTC",
    );
    expect(rows.map((s) => s.scheduledDate)).toEqual([
        "2026-10-03",
        "2026-10-03",
        "2026-10-04",
    ]);
});
test("unavailable and circle-completed portions do not block the remaining queue", () => {
    const rows = carryForwardSessions(
        [
            { ...queue[0], available: false },
            { ...queue[1], done: true },
            queue[2],
        ],
        "2026-10-05",
        allDays,
        "UTC",
    );
    expect(rows.at(-1).scheduledDate).toBe("2026-10-05");
});
test("new batches start after carried portions, with no duplicate calendar week", () => {
    expect(nextPlanStart("2026-09-28", queue, "UTC")).toBe("2026-10-05");
    const rows = carryForwardSessions(queue, "2026-10-05", [1, 3, 5], "UTC");
    expect(nextPlanStart("2026-09-28", rows, "UTC")).toBe("2026-10-10");
});
test("local completion days reserve capacity across DST and midnight", () => {
    const rows = carryForwardSessions(
        [
            { ...queue[0], done: true, completedAt: "2026-10-03T23:30:00Z" },
            queue[1],
        ],
        "2026-10-04",
        allDays,
        "Africa/Casablanca",
    );
    expect(rows.map((s) => s.scheduledDate)).toEqual([
        "2026-10-04",
        "2026-10-05",
    ]);
    expect(
        carryForwardSessions(queue, "2026-10-04", [], "UTC").map(
            (s) => s.scheduledDate,
        ),
    ).toEqual([null, null, null]);
});

test("saved weekday changes reflow the screenshot's Friday–Sunday queue onto Monday, Tuesday and Thursday", () => {
    const rows = carryForwardSessions(
        queue,
        "2026-10-03",
        [1, 2, 4, 5],
        "Africa/Casablanca",
        [5, 6, 7],
    );
    expect(rows.map((s) => s.scheduledDate)).toEqual([
        "2026-10-05",
        "2026-10-06",
        "2026-10-08",
    ]);
    expect(rows.map((s) => s.originalScheduledDate)).toEqual(
        queue.map((s) => s.scheduledDate),
    );
    expect(rows.map((s) => s.id)).toEqual(queue.map((s) => s.id));
});

test("adding an earlier day brings future pending portions forward without changing their ranges or progress", () => {
    const original = [
        session("future", "2026-10-09", {
            startAyahNumber: 1,
            endAyahNumber: 24,
            progressAyahNumber: 7,
            peer: 3,
        }),
    ];
    const rows = carryForwardSessions(
        original,
        "2026-10-03",
        [1, 5],
        "UTC",
        [5],
    );
    expect(rows).toEqual([
        {
            ...original[0],
            scheduledDate: "2026-10-05",
            originalScheduledDate: "2026-10-09",
        },
    ]);
    // Reordering the same weekdays is not a schedule change.
    expect(
        carryForwardSessions(original, "2026-10-03", [5, 1], "UTC", [1, 5])[0]
            .scheduledDate,
    ).toBe("2026-10-09");
});

test("clearing and restoring days keeps completed work and pending sessions intact", () => {
    const original = [
        { ...queue[0], done: true, completedAt: "2026-10-03T08:00:00Z" },
        { ...queue[1], progressAyahNumber: 30 },
        queue[2],
    ];
    const waiting = carryForwardSessions(
        original,
        "2026-10-03",
        [],
        "UTC",
        [5, 6, 7],
    );
    expect(waiting.map((s) => s.scheduledDate)).toEqual([
        "2026-10-03",
        null,
        null,
    ]);
    expect(waiting[1].progressAyahNumber).toBe(30);
    const restored = carryForwardSessions(
        original,
        "2026-10-03",
        [6, 7],
        "UTC",
        [5, 6, 7],
    );
    expect(restored.map((s) => s.scheduledDate)).toEqual([
        "2026-10-03",
        "2026-10-04",
        "2026-10-10",
    ]);
    const changedAgain = carryForwardSessions(
        original,
        "2026-10-03",
        [2, 4],
        "UTC",
        [5, 6, 7],
    );
    expect(changedAgain.map((s) => s.scheduledDate)).toEqual([
        "2026-10-03",
        "2026-10-06",
        "2026-10-08",
    ]);
    expect(original[1].scheduledDate).toBe("2026-10-03");
    expect(nextPlanStart("2026-09-28", waiting, "UTC")).toBe("2026-10-05");
});
