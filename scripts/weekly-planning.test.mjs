import { expect, test } from "bun:test";
import { carryForwardSessions } from "../src/features/learning/carry-forward";
import {
    balanceWeek,
    dailyLoads,
    initialDraft,
    planningDraftSchema,
    validatePlacements,
    weekDates,
} from "../src/features/planning/planner";

const dates = weekDates("2026-10-05");
const task = (id, extra = {}) => ({
    id,
    kind: "practice",
    date: null,
    minutes: 30,
    done: false,
    movable: true,
    minDate: dates[0],
    maxDate: dates[6],
    timezone: "UTC",
    deadline: null,
    groupName: null,
    sequence: null,
    sessionIds: [id],
    ranges: [],
    href: null,
    ...extra,
});
const view = (tasks, extra = {}) => ({
    weekStart: dates[0],
    today: dates[0],
    timezone: "UTC",
    version: "a".repeat(64),
    capacities: Array(7).fill(45),
    tasks,
    ...extra,
});

test("week dates use calendar days across month, year, and DST boundaries", () => {
    expect(weekDates("2026-12-28")).toEqual([
        "2026-12-28",
        "2026-12-29",
        "2026-12-30",
        "2026-12-31",
        "2027-01-01",
        "2027-01-02",
        "2027-01-03",
    ]);
    expect(weekDates("2026-10-26").at(-1)).toBe("2026-11-01");
});

test("workload includes fixed and completed tasks, excludes inbox, and flags zero capacity", () => {
    const draft = initialDraft(
        view(
            [
                task("a", { date: dates[0], minutes: 40 }),
                task("b", {
                    date: dates[0],
                    minutes: 20,
                    done: true,
                    movable: false,
                }),
                task("inbox"),
            ],
            { capacities: [0, 45, 45, 45, 45, 45, 45] },
        ),
    );
    expect(dailyLoads(draft)[0]).toEqual({
        date: dates[0],
        minutes: 60,
        capacity: 0,
        count: 2,
        over: 60,
    });
    expect(dailyLoads(draft)[1].minutes).toBe(0);
});

test("drafts reject malformed dates, estimates, and capacity arrays", () => {
    const draft = initialDraft(view([task("a")]));
    expect(planningDraftSchema.safeParse(draft).success).toBe(true);
    for (const change of [
        { weekStart: "2026-10-06" },
        { weekStart: "2026-02-30" },
        { capacities: [45] },
        { capacities: [-1, ...Array(6).fill(45)] },
        { tasks: [{ id: "a", date: "2026-02-30", minutes: 30 }] },
        { tasks: [{ id: "a", date: null, minutes: 0 }] },
    ])
        expect(
            planningDraftSchema.safeParse({ ...draft, ...change }).success,
        ).toBe(false);
});

test("a draft must contain exactly the current owner's tasks and version", () => {
    const current = view([task("a"), task("b")]);
    const draft = initialDraft(current);
    expect(
        validatePlacements(current, { ...draft, version: "b".repeat(64) }),
    ).toBe("stale");
    expect(
        validatePlacements(current, {
            ...draft,
            tasks: [draft.tasks[0], draft.tasks[0]],
        }),
    ).toBe("invalid");
    expect(
        validatePlacements(current, {
            ...draft,
            tasks: [draft.tasks[0], { ...draft.tasks[1], id: "other-owner" }],
        }),
    ).toBe("invalid");
    expect(
        validatePlacements(current, { ...draft, tasks: [draft.tasks[0]] }),
    ).toBe("invalid");
});

test("completed tasks, deadlines, and each plan's local today constrain moves", () => {
    const fixed = view([
        task("a", { date: dates[0], movable: false, done: true }),
    ]);
    expect(
        validatePlacements(fixed, {
            ...initialDraft(fixed),
            tasks: [{ id: "a", date: dates[1], minutes: 30 }],
        }),
    ).toBe("locked");
    const current = view([
        task("a", { kind: "circle", minDate: dates[2], maxDate: dates[4] }),
    ]);
    for (const date of [dates[0], dates[5], "2026-10-12"])
        expect(
            validatePlacements(current, {
                ...initialDraft(current),
                tasks: [{ id: "a", date, minutes: 30 }],
            }),
        ).toBe("date");
    expect(
        validatePlacements(current, {
            ...initialDraft(current),
            tasks: [{ id: "a", date: dates[3], minutes: 30 }],
        }),
    ).toBeNull();
});

test("automatic portions stay in order, on distinct dates and within the week", () => {
    const current = view([
        task("a", { kind: "memorization", sequence: 0, date: dates[0] }),
        task("b", { kind: "memorization", sequence: 1, date: dates[2] }),
    ]);
    const draft = initialDraft(current);
    for (const date of [dates[2], dates[3], null]) {
        draft.tasks[0].date = date;
        expect(validatePlacements(current, draft)).toBe("order");
    }
    draft.tasks[0].date = "2026-10-12";
    expect(validatePlacements(current, draft)).toBe("date");
    draft.tasks[0].date = dates[1];
    expect(validatePlacements(current, draft)).toBeNull();
});

test("circle deadlines stay visible and cannot be cleared from the week", () => {
    const current = view([
        task("circle", { kind: "circle", date: dates[3], deadline: dates[3] }),
    ]);
    const draft = initialDraft(current);
    draft.tasks[0].date = null;
    expect(validatePlacements(current, draft)).toBe("date");
});

test("balancing reduces overload without changing amounts, deadlines, fixed dates, or source draft", () => {
    const current = view([
        task("fixed", {
            date: dates[0],
            minutes: 45,
            done: true,
            movable: false,
        }),
        task("memo1", {
            kind: "memorization",
            date: dates[0],
            sequence: 0,
            minutes: 30,
        }),
        task("memo2", {
            kind: "memorization",
            date: dates[1],
            sequence: 1,
            minutes: 30,
        }),
        task("circle", {
            kind: "circle",
            date: dates[0],
            maxDate: dates[3],
            minutes: 30,
        }),
        task("personal"),
    ]);
    const draft = initialDraft(current),
        before = JSON.stringify(draft);
    const result = balanceWeek(current, draft);
    expect(validatePlacements(current, result)).toBeNull();
    expect(dailyLoads(result).reduce((sum, day) => sum + day.over, 0)).toBe(0);
    expect(result.tasks.find((item) => item.id === "fixed").date).toBe(
        dates[0],
    );
    expect(
        result.tasks.find((item) => item.id === "circle").date <= dates[3],
    ).toBe(true);
    expect(result.tasks.map((item) => item.minutes)).toEqual(
        draft.tasks.map((item) => item.minutes),
    );
    expect(JSON.stringify(draft)).toBe(before);
});

test("balancing never invents capacity on rest days or silently drops work", () => {
    const current = view(
        [
            task("memo", { kind: "memorization", date: dates[0], sequence: 0 }),
            task("personal"),
        ],
        { capacities: Array(7).fill(0) },
    );
    const draft = initialDraft(current),
        result = balanceWeek(current, draft);
    expect(result.tasks).toEqual(draft.tasks);
    expect(dailyLoads(result)[0].over).toBe(30);
});

const session = (id, scheduledDate, extra = {}) => ({
    id,
    scheduledDate,
    completedAt: null,
    done: false,
    ...extra,
});
test("one-off placements apply to reader dates without changing recurring study days", () => {
    const rows = [
        session("a", dates[0], { plannedDate: dates[1] }),
        session("b", dates[2], { plannedDate: dates[3] }),
    ];
    const result = carryForwardSessions(rows, dates[0], [1, 3, 5], "UTC");
    expect(result.map((row) => row.scheduledDate)).toEqual([
        dates[1],
        dates[3],
    ]);
    expect(result.map((row) => row.originalScheduledDate)).toEqual([
        dates[0],
        dates[2],
    ]);
    expect(rows[0].scheduledDate).toBe(dates[0]);
});
test("missed one-off placements fall back to recurring days; cleared schedules stay unscheduled", () => {
    const rows = [session("a", dates[0], { plannedDate: dates[1] })];
    expect(
        carryForwardSessions(rows, dates[2], [1, 3, 5], "UTC")[0].scheduledDate,
    ).toBe(dates[2]);
    expect(
        carryForwardSessions(rows, dates[0], [], "UTC")[0].scheduledDate,
    ).toBeNull();
});
test("one-off placements cannot bypass weekly capacity or a completed daily portion", () => {
    const rows = [
        session("done", dates[0], {
            done: true,
            completedAt: new Date(`${dates[1]}T12:00:00Z`),
        }),
        session("next", dates[2], { plannedDate: dates[1] }),
    ];
    expect(
        carryForwardSessions(rows, dates[1], [1, 3, 5], "UTC")[1].scheduledDate,
    ).toBe(dates[2]);
    const capacity = {
        canSchedule: (_, day) => day >= "2026-10-12",
        reserve: () => {},
    };
    expect(
        carryForwardSessions(
            [session("next", dates[0], { plannedDate: dates[1] })],
            dates[0],
            [1, 3, 5],
            "UTC",
            [1, 3, 5],
            capacity,
        )[0].scheduledDate,
    ).toBe("2026-10-12");
});
