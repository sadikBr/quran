import { expect, test } from "bun:test";
import {
    adhkarCompletionSchema,
    checklistSettingsSchema,
    groupTodayChecklist,
    localChecklistDate,
    visibleTodayTasks,
} from "../src/features/plans/daily-checklist";
import { practiceChecklistState } from "../src/features/plans/today-practice";

const settings = { visible: [], revision: 0, resetAt: null };
test("adhkar form one complete card before the Dashboard limit, with a stable row order", () => {
    const tasks = [
        { id: "wird", kind: "wird", done: true },
        { id: "revision", kind: "revision", done: false },
        { id: "practice", kind: "practice", done: false },
        ...["sleep", "evening", "morning"].map((category) => ({
            id: category,
            kind: "adhkar",
            done: category === "morning",
            adhkar: { category, completed: category === "morning" },
        })),
    ];
    const cards = groupTodayChecklist(tasks).slice(0, 4);
    expect(cards.map((card) => card.id)).toEqual([
        "wird",
        "revision",
        "practice",
        "adhkar",
    ]);
    expect(cards[3].items.map((item) => item.category)).toEqual([
        "morning",
        "evening",
        "sleep",
    ]);
    expect(cards[3].done).toBe(false);
    const onlyMorning = groupTodayChecklist(
        visibleTodayTasks(tasks, {
            ...settings,
            visible: ["wird", "adhkar.morning"],
        }),
    );
    expect(onlyMorning.map((card) => card.id)).toEqual(["wird", "adhkar"]);
    expect(onlyMorning[1].items).toHaveLength(1);
    expect(onlyMorning[1].done).toBe(true);
    expect(groupTodayChecklist(visibleTodayTasks(tasks, settings))).toEqual([]);
});
test("checklist choices allow hiding everything, normalize duplicates, and reject unknown choices", () => {
    expect(checklistSettingsSchema.parse(settings).visible).toEqual([]);
    expect(
        checklistSettingsSchema.parse({
            ...settings,
            visible: ["adhkar.sleep", "wird", "wird"],
        }).visible,
    ).toEqual(["wird", "adhkar.sleep"]);
    expect(
        checklistSettingsSchema.safeParse({ ...settings, visible: ["score"] })
            .success,
    ).toBe(false);
    expect(
        adhkarCompletionSchema.safeParse({
            category: "after-salah",
            date: "2026-10-08",
            timezone: "UTC",
            revision: 0,
            completed: true,
            resetAt: null,
        }).success,
    ).toBe(false);
});

test("selection keeps adhkar collections independent and completed items visible without changing source tasks", () => {
    const tasks = [
        { id: "wird", kind: "wird", done: true },
        {
            id: "morning",
            kind: "adhkar",
            adhkar: { category: "morning" },
            done: false,
        },
        {
            id: "evening",
            kind: "adhkar",
            adhkar: { category: "evening" },
            done: false,
        },
        { id: "circle", kind: "circle", done: false },
    ];
    expect(
        visibleTodayTasks(tasks, {
            ...settings,
            visible: ["wird", "adhkar.morning"],
        }).map((t) => t.id),
    ).toEqual(["wird", "morning"]);
    expect(tasks.map((t) => t.id)).toEqual([
        "wird",
        "morning",
        "evening",
        "circle",
    ]);
    expect(visibleTodayTasks(tasks, settings)).toEqual([]);
});

test("checklist day follows the saved timezone across midnight and daylight-saving changes", () => {
    const now = new Date("2026-10-08T23:30:00Z");
    expect(localChecklistDate("Africa/Casablanca", now)).toBe("2026-10-09");
    expect(localChecklistDate("UTC", now)).toBe("2026-10-08");
    expect(
        localChecklistDate(
            "America/New_York",
            new Date("2026-11-01T05:30:00Z"),
        ),
    ).toBe("2026-11-01");
    expect(
        localChecklistDate(
            "America/New_York",
            new Date("2026-11-01T06:30:00Z"),
        ),
    ).toBe("2026-11-01");
});

const today = "2026-10-08";
const assignment = {
    status: "in_progress",
    plannedDate: null,
    dueAt: null,
    submittedAt: null,
    reviewedAt: null,
};
const state = (extra, day = today) =>
    practiceChecklistState(
        { ...assignment, ...extra },
        day,
        "Africa/Casablanca",
    );
test("unfinished assignments include overdue and unscheduled work, but not future work", () => {
    expect(state({})).toEqual({ done: false, submitted: false });
    expect(state({ plannedDate: "2026-10-07" })).toEqual({
        done: false,
        submitted: false,
    });
    expect(state({ plannedDate: "2026-10-09" })).toBeNull();
    expect(state({ dueAt: new Date("2026-10-08T23:30:00Z") })).toBeNull();
});
test("submitted and completed assignments remain on their local completion day", () => {
    const submittedAt = new Date("2026-10-07T23:30:00Z");
    expect(state({ status: "submitted", submittedAt })).toEqual({
        done: true,
        submitted: true,
    });
    expect(state({ status: "completed", submittedAt })).toEqual({
        done: true,
        submitted: false,
    });
    expect(state({ status: "completed", reviewedAt: submittedAt })).toEqual({
        done: true,
        submitted: false,
    });
    expect(
        state({ status: "submitted", submittedAt }, "2026-10-09"),
    ).toBeNull();
    expect(
        state({
            status: "completed",
            submittedAt: new Date("2026-10-06T12:00:00Z"),
        }),
    ).toBeNull();
});
test("work completed early appears checked on its scheduled day, without leaking future completions", () => {
    expect(
        state({
            status: "completed",
            plannedDate: today,
            reviewedAt: new Date("2026-10-06T12:00:00Z"),
        }),
    ).toEqual({ done: true, submitted: false });
    expect(
        state({
            status: "submitted",
            dueAt: new Date("2026-10-08T12:00:00Z"),
            submittedAt: new Date("2026-10-06T12:00:00Z"),
        }),
    ).toEqual({ done: true, submitted: true });
    expect(
        state({
            status: "completed",
            plannedDate: today,
            reviewedAt: new Date("2026-10-10T12:00:00Z"),
        }),
    ).toBeNull();
    expect(state({ status: "completed", plannedDate: today })).toBeNull();
});
