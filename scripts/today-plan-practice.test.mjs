import { expect, test } from "bun:test";
import {
    carryForwardSessions,
    isActivePlanSession,
} from "../src/features/learning/carry-forward";
import { todayPlanSessions } from "../src/features/learning/today-practice";
import { weekCalendar } from "../src/features/revision/schedule";

const today = "2026-10-03";
const row = (id, scheduledDate, extra = {}) => ({
    id,
    scheduledDate,
    done: false,
    available: true,
    completedAt: null,
    startSurahNumber: 2,
    startAyahNumber: 1,
    endSurahNumber: 2,
    endAyahNumber: 10,
    completed: 0,
    total: 10,
    ...extra,
});
const view = (sessions, extra = {}) => ({
    today,
    plan: { enabled: true },
    week: { riwayah: "warsh", timezone: "Africa/Casablanca" },
    sessions: sessions.map((s) => ({
        ...s,
        active: isActivePlanSession(s, today, true),
    })),
    ...extra,
});

test("Practice contains only today's available, unfinished sessions from both enabled plans", () => {
    const rows = [
        row("today", today, { progressSurahNumber: 2, progressAyahNumber: 4 }),
        row("future", "2026-10-05"),
        row("past", "2026-10-02"),
        row("unscheduled", null),
        row("done", today, { done: true }),
        row("removed", today, { available: false }),
    ];
    const mem = view(rows);
    const rev = view(
        rows.map((r) => ({ ...r, peer: 3 })),
        { week: { riwayah: "hafs", timezone: "UTC" } },
    );
    const cards = todayPlanSessions(mem, rev);
    expect(
        cards.map((s) => [s.id, s.kind, s.riwayah, s.credited, s.started]),
    ).toEqual([
        ["today", "memorization", "warsh", 0, true],
        ["today", "revision", "hafs", 3, true],
    ]);
    expect(
        todayPlanSessions({ ...mem, plan: { enabled: false } }, rev),
    ).toHaveLength(1);
    expect(
        todayPlanSessions({ ...mem, plan: null }, { ...rev, week: null }),
    ).toEqual([]);
});

test("missed and split daily portions appear together, with no early access to tomorrow", () => {
    const queue = [
        row("a", "2026-10-02"),
        row("b", "2026-10-02"),
        row("c", today),
    ];
    const project = (rows) =>
        view(carryForwardSessions(rows, today, [1, 2, 3, 4, 5, 6, 7], "UTC"));
    const empty = view([]);
    expect(todayPlanSessions(project(queue), empty).map((s) => s.id)).toEqual([
        "a",
        "b",
    ]);
    queue[0] = { ...queue[0], done: true, completedAt: `${today}T10:00:00Z` };
    expect(todayPlanSessions(project(queue), empty).map((s) => s.id)).toEqual([
        "b",
    ]);
    queue[1] = { ...queue[1], done: true, completedAt: `${today}T10:00:00Z` };
    expect(todayPlanSessions(project(queue), empty)).toEqual([]);
});

test("changing saved weekdays removes today's cards until the next selected day", () => {
    const queue = [row("a", "2026-10-02"), row("b", today)];
    for (const days of [[1, 2, 4, 5], []]) {
        const projected = carryForwardSessions(
            queue,
            today,
            days,
            "UTC",
            [5, 6, 7],
        );
        expect(todayPlanSessions(view(projected), view([]))).toEqual([]);
    }
});

test("daily checklist keeps completed guided sessions, including carried work and paused plans", () => {
    const completed = row("finished", "2026-10-02", {
        done: true,
        completedAt: `${today}T10:00:00Z`,
    });
    const projected = carryForwardSessions(
        [completed, row("next", today)],
        today,
        [1, 2, 3, 4, 5, 6, 7],
        "UTC",
    );
    const paused = view(projected, { plan: { enabled: false } });
    expect(todayPlanSessions(paused, view([]))).toEqual([]);
    expect(
        todayPlanSessions(paused, view([]), true).map((s) => [s.id, s.done]),
    ).toEqual([["finished", true]]);
    const tomorrow = view([row("old", today, { done: true })], {
        today: "2026-10-04",
    });
    expect(todayPlanSessions(tomorrow, view([]), true)).toEqual([]);
});

test("each plan uses its own local day across midnight, not the viewer's UTC date", () => {
    const now = new Date("2026-10-03T23:30:00Z");
    const local = weekCalendar(now, "Africa/Casablanca").today;
    const utc = weekCalendar(now, "UTC").today;
    expect(local).toBe("2026-10-04");
    expect(utc).toBe(today);
    expect(isActivePlanSession(row("a", today), local, true)).toBe(false);
    expect(isActivePlanSession(row("b", local), local, true)).toBe(true);
    expect(isActivePlanSession(row("c", today), utc, true)).toBe(true);
    expect(isActivePlanSession(row("c", today), utc, false)).toBe(false);
});
