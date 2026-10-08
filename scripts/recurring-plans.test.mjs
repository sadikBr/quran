import { expect, test } from "bun:test";
import {
    balanceWeek,
    dailyLoads,
    initialDraft,
    planningDraftSchema,
    validatePlacements,
    weekDates,
} from "../src/features/planning/planner";
import {
    occursOn,
    recurringPlanningTasks,
    recurringReminderDate,
    recurringSettingsFromForm,
    recurringSettingsSchema,
    recurringToday,
} from "../src/features/plans/recurrence";

const friday = new Date("2026-10-09T12:00:00Z");
const settings = {
    title: "Read Al-Kahf",
    notes: "",
    days: [5],
    timezone: "Africa/Casablanca",
    minutes: 20,
    reminderTime: "13:00",
    surahNumber: 18,
    resourceUrl: null,
};

test("submission reads the displayed reminder, name and selected days from the form", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
        title: "Evening study",
        notes: "",
        timezone: "UTC",
        minutes: "30",
        reminderTime: "21:30",
        surahNumber: "67",
        resourceUrl: "",
    }))
        form.set(key, value);
    form.append("days", "5");
    form.append("days", "6");
    const parsed = recurringSettingsFromForm(form);
    expect(parsed.success).toBe(true);
    expect(parsed.data.reminderTime).toBe("21:30");
    expect(parsed.data.title).toBe("Evening study");
    expect(parsed.data.days).toEqual([5, 6]);
    expect(parsed.data.surahNumber).toBe(67);
    expect(parsed.data.resourceUrl).toBeNull();
});
const plan = {
    ...settings,
    id: "kahf",
    userId: "owner",
    startDate: "2026-10-08",
    enabled: true,
    archived: false,
    revision: 1,
    createdAt: new Date("2026-10-08T12:00:00Z"),
};
const state = (overrides = {}, occurrences = []) => ({
    plans: [{ ...plan, ...overrides }],
    occurrences,
});

test("recurrence validates names, days, zones, duration, surahs and safe resource links", () => {
    expect(
        recurringSettingsSchema.parse({ ...settings, days: [6, 5, 5] }).days,
    ).toEqual([5, 6]);
    for (const change of [
        { title: " " },
        { days: [] },
        { days: [0] },
        { timezone: "Mars/Olympus" },
        { minutes: 0 },
        { minutes: 481 },
        { surahNumber: 115 },
        { reminderTime: "25:00" },
        { resourceUrl: "javascript:alert(1)" },
        { resourceUrl: "file:///tmp/book" },
    ])
        expect(
            recurringSettingsSchema.safeParse({ ...settings, ...change })
                .success,
        ).toBe(false);
    expect(
        recurringSettingsSchema.safeParse({
            ...settings,
            resourceUrl: "https://example.com/tafsir",
        }).success,
    ).toBe(true);
});

test("Friday plans appear only on Friday, starting on their creation date", () => {
    expect(occursOn(plan, "2026-10-09")).toBe(true);
    for (const date of [
        "2026-10-02",
        "2026-10-10",
        "2026-02-30",
        "2026-10-09T12:00:00",
    ])
        expect(occursOn(plan, date)).toBe(false);
    const tasks = recurringPlanningTasks(
        state(),
        weekDates("2026-10-05"),
        {},
        friday,
    );
    expect(tasks.map((task) => task.date)).toEqual(["2026-10-09"]);
    expect(tasks[0].href).toBe("/quran/surah/18");
});

test("missing a Friday does not create Saturday work or accumulate next week", () => {
    expect(
        recurringPlanningTasks(
            state(),
            null,
            {},
            new Date("2026-10-10T12:00:00Z"),
        ),
    ).toEqual([]);
    const tasks = recurringPlanningTasks(
        state(),
        weekDates("2026-10-12"),
        {},
        new Date("2026-10-16T12:00:00Z"),
    );
    expect(tasks.map((task) => task.date)).toEqual(["2026-10-16"]);
});

test("daily routines use calendar days across daylight-saving and year boundaries", () => {
    const tasks = recurringPlanningTasks(
        state({ days: [1, 2, 3, 4, 5, 6, 7], timezone: "Europe/Paris" }),
        weekDates("2026-10-26"),
        {},
        new Date("2026-10-25T12:00:00Z"),
    );
    expect(tasks).toHaveLength(7);
    expect(
        recurringPlanningTasks(
            state({ days: [1, 2, 3, 4, 5, 6, 7] }),
            weekDates("2026-12-28"),
            {},
            friday,
        ).at(-1).date,
    ).toBe("2027-01-03");
});

test("Today respects each plan's timezone on either side of midnight", () => {
    const now = new Date("2026-10-09T00:15:00Z");
    expect(recurringToday({ timezone: "America/Los_Angeles" }, now)).toBe(
        "2026-10-08",
    );
    expect(
        recurringPlanningTasks(
            state({ timezone: "America/Los_Angeles" }),
            null,
            {},
            now,
        ),
    ).toEqual([]);
    expect(
        recurringPlanningTasks(
            state({ timezone: "Asia/Tokyo" }),
            null,
            {},
            now,
        )[0].date,
    ).toBe("2026-10-09");
});

const completed = {
    planId: "kahf",
    localDate: "2026-10-09",
    status: "completed",
    snapshot: { ...settings },
    recordedAt: friday,
};
test("completion is independent per date and retained when the plan is edited or paused", () => {
    const tasks = recurringPlanningTasks(
        state({ title: "Changed name", enabled: false }, [completed]),
        weekDates("2026-10-05"),
        {},
        friday,
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Read Al-Kahf");
    expect(tasks[0].done).toBe(true);
    expect(tasks[0].recurring.actionable).toBe(true);
    expect(
        recurringPlanningTasks(
            state({}, [completed]),
            ["2026-10-16"],
            {},
            friday,
        )[0].done,
    ).toBe(false);
    expect(
        recurringPlanningTasks(state({ archived: true }), null, {}, friday),
    ).toEqual([]);
});

test("weekly balancing preserves fixed routines, and skipping releases their time budget", () => {
    const dates = weekDates("2026-10-05");
    const tasks = recurringPlanningTasks(state(), dates, {}, friday);
    const view = {
        weekStart: dates[0],
        today: "2026-10-09",
        timezone: "UTC",
        version: "a".repeat(64),
        capacities: [60, 60, 60, 60, 0, 60, 60],
        tasks,
    };
    const draft = initialDraft(view);
    expect(balanceWeek(view, draft).tasks[0].date).toBe("2026-10-09");
    expect(dailyLoads(draft)[4].over).toBe(20);
    expect(
        validatePlacements(view, {
            ...draft,
            tasks: [{ ...draft.tasks[0], date: "2026-10-10" }],
        }),
    ).toBe("locked");
    const skipped = {
        ...view,
        tasks: recurringPlanningTasks(
            state({}, [{ ...completed, status: "skipped" }]),
            dates,
            {},
            friday,
        ),
    };
    expect(planningDraftSchema.safeParse(initialDraft(skipped)).success).toBe(
        true,
    );
    expect(validatePlacements(skipped, initialDraft(skipped))).toBeNull();
    expect(dailyLoads(initialDraft(skipped))[4].minutes).toBe(0);
    expect(
        validatePlacements(view, {
            ...draft,
            tasks: [{ ...draft.tasks[0], minutes: 0 }],
        }),
    ).toBe("invalid");
});

test("reminders use local time, have a bounded retry window and exclude paused plans", () => {
    expect(
        recurringReminderDate(plan, new Date("2026-10-09T11:59:00Z")),
    ).toBeNull();
    expect(recurringReminderDate(plan, friday)).toBe("2026-10-09");
    expect(recurringReminderDate(plan, new Date("2026-10-09T12:29:00Z"))).toBe(
        "2026-10-09",
    );
    expect(
        recurringReminderDate(plan, new Date("2026-10-09T12:30:00Z")),
    ).toBeNull();
    for (const change of [
        { enabled: false },
        { archived: true },
        { reminderTime: null },
        { days: [6] },
    ])
        expect(
            recurringReminderDate({ ...plan, ...change }, friday),
        ).toBeNull();
});
