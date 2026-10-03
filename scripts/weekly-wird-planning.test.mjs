import { expect, test } from "bun:test";
import {
    balanceWeek,
    dailyLoads,
    initialDraft,
    validatePlacements,
    weekDates,
} from "../src/features/planning/planner";
import { buildWirdPlanningTasks } from "../src/features/planning/wird-tasks";

const dates = weekDates("2026-09-28");
const hafs = Array.from({ length: 6236 }, (_, i) => ({
    surahNumber: Math.floor(i / 100) + 1,
    ayahNumber: (i % 100) + 1,
    page: Math.floor((i * 604) / 6236) + 1,
    quarter: Math.floor((i * 240) / 6236) + 1,
    hizb: Math.floor((i * 60) / 6236) + 1,
    atoms: [`verse-${i + 1}`],
}));
const divisions = (key) =>
    hafs.flatMap((verse, i) =>
        i === 0 || hafs[i - 1][key] !== verse[key]
            ? [
                  {
                      number: verse[key],
                      globalAyahNumber: i + 1,
                      surahNumber: verse.surahNumber,
                      ayahNumber: verse.ayahNumber,
                      pageNumber: verse.page,
                  },
              ]
            : [],
    );
const navigation = {
    pages: divisions("page"),
    hizbs: divisions("hizb"),
    hizbQuarters: divisions("quarter"),
    juzs: divisions("hizb").filter((item) => item.number % 2 === 1),
};
const surahs = Array.from({ length: 63 }, (_, i) => ({
    number: i + 1,
    numberOfAyahs: i === 62 ? 36 : 100,
}));
const record = (extra = {}) => ({
    userId: "owner",
    unit: "ayah",
    amount: 10,
    targetStartGlobalAyah: 1,
    targetEndGlobalAyah: 10,
    targetDate: dates[0],
    completedAt: null,
    progressGlobalAyah: null,
    progressVerse: null,
    nextGoal: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
});
const plan = (extra = {}) => ({
    userId: "owner",
    targetDate: "2026-11-30",
    durationWeeks: 8,
    repeatable: false,
    currentGlobalAyah: 1,
    startGlobalAyah: 1,
    measurement: "page",
    isActive: true,
    completedAt: null,
    restDays: [],
    ...extra,
});
const build = (extra = {}) =>
    buildWirdPlanningTasks({
        record: record(),
        plan: null,
        history: [],
        dates,
        today: dates[0],
        navigation,
        surahs,
        catalogue: { hafs, warsh: hafs },
        riwayah: "hafs",
        estimates: {},
        ...extra,
    });

test("daily wird covers the week and reserves time without changing reading progress", () => {
    const saved = record({ progressGlobalAyah: 5 }),
        before = JSON.stringify(saved);
    const tasks = build({ record: saved });
    expect(tasks.map((t) => t.date)).toEqual(dates);
    expect(
        tasks.every(
            (t) => t.kind === "wird" && !t.movable && t.estimateEditable,
        ),
    ).toBe(true);
    expect(tasks[0].href).toBe("/wird/read");
    expect(
        tasks.slice(1).every((t) => t.href === null && t.wirdProjected),
    ).toBe(true);
    expect(tasks.map((t) => t.ranges[0].startAyahNumber)).toEqual([
        1, 11, 21, 31, 41, 51, 61,
    ]);
    expect(JSON.stringify(saved)).toBe(before);
});

test("a missed portion appears once on today, without inventing work on past days", () => {
    const tasks = build({ today: dates[5] });
    expect(tasks.map((t) => t.date)).toEqual(dates.slice(5));
    expect(tasks[0].ranges[0].startAyahNumber).toBe(1);
    expect(tasks[1].ranges[0].startAyahNumber).toBe(11);
});

test("completion uses the Casablanca day, includes history, and does not duplicate the current row", () => {
    const saved = record({ completedAt: new Date("2026-09-28T23:30:00Z") });
    const tasks = build({
        record: saved,
        today: dates[1],
        history: [{ ...saved, id: "history" }],
    });
    expect(tasks[0].date).toBe(dates[1]);
    expect(tasks[0].done).toBe(true);
    expect(tasks[0].estimateEditable).toBe(false);
    expect(tasks.filter((t) => t.date === dates[1])).toHaveLength(1);
    expect(tasks[1].date).toBe(dates[2]);
    expect(tasks[1].ranges[0].startAyahNumber).toBe(11);
});

test("a completed earlier portion forecasts today's next goal, even before reader rollover", () => {
    const tasks = build({
        today: dates[2],
        record: record({
            completedAt: new Date(`${dates[0]}T12:00:00Z`),
            nextGoal: { unit: "ayah", amount: 20 },
        }),
    });
    expect(tasks[0].done).toBe(true);
    expect(tasks[1].date).toBe(dates[2]);
    expect(tasks[1].ranges[0]).toMatchObject({
        startAyahNumber: 11,
        endAyahNumber: 30,
    });
    expect(tasks[1].href).toBe("/wird/read");
});

test("future scheduled portions are not pulled into today and pending goal edits start afterwards", () => {
    const tasks = build({
        record: record({
            targetDate: dates[3],
            nextGoal: { unit: "ayah", amount: 20 },
        }),
    });
    expect(tasks.map((t) => t.date)).toEqual(dates.slice(3));
    expect(tasks[0].ranges[0].endAyahNumber).toBe(10);
    expect(tasks[0].href).toBeNull();
    expect(tasks[1].ranges[0].endAyahNumber).toBe(30);
});

test("forecasts continue across week boundaries without reusing today's portion", () => {
    const tasks = build({ dates: weekDates("2026-10-05") });
    expect(tasks).toHaveLength(7);
    expect(tasks[0].ranges[0].startAyahNumber).toBe(71);
    expect(tasks.every((t) => t.wirdProjected && t.href === null)).toBe(true);
});

test("adaptive khatmah forecasts stop at completion or start a repeat cycle", () => {
    const saved = record({
        targetStartGlobalAyah: 6225,
        targetEndGlobalAyah: 6236,
    });
    const once = build({
        record: saved,
        plan: plan({ currentGlobalAyah: 6225 }),
    });
    expect(once).toHaveLength(1);
    const repeatingPlan = plan({ currentGlobalAyah: 6225, repeatable: true });
    const before = JSON.stringify(repeatingPlan);
    const repeated = build({ record: saved, plan: repeatingPlan });
    expect(repeated).toHaveLength(7);
    expect(repeated[1].ranges[0]).toMatchObject({
        startSurahNumber: 1,
        startAyahNumber: 1,
    });
    expect(JSON.stringify(repeatingPlan)).toBe(before);
    expect(
        build({
            record: record({
                ...saved,
                completedAt: new Date(`${dates[0]}T12:00:00Z`),
            }),
            plan: plan({ isActive: false, completedAt: new Date() }),
        }),
    ).toHaveLength(1);
});

test("no wird setup produces no invented routine; completed history remains visible", () => {
    expect(build({ record: null })).toEqual([]);
    const history = [
        {
            ...record(),
            id: "old",
            completedAt: new Date(`${dates[0]}T12:00:00Z`),
        },
    ];
    expect(build({ record: null, history })).toHaveLength(1);
});

test("Warsh forecast ranges use native correspondence and retain saved time estimates", () => {
    const warsh = [
        { ...hafs[0], ayahNumber: 1 },
        { ...hafs[0], ayahNumber: 2 },
        { ...hafs[1], ayahNumber: 3 },
    ];
    const tasks = build({
        record: record({ amount: 2, targetEndGlobalAyah: 2 }),
        catalogue: { hafs, warsh },
        riwayah: "warsh",
        estimates: { [`wird:${dates[0]}`]: 25 },
    });
    expect(tasks[0].ranges[0]).toMatchObject({
        startAyahNumber: 1,
        endAyahNumber: 3,
    });
    expect(tasks[0].minutes).toBe(25);
});

test("wird time is editable, counts toward overload, and balancing never moves it", () => {
    const view = {
        weekStart: dates[0],
        today: dates[0],
        timezone: "UTC",
        version: "a".repeat(64),
        capacities: Array(7).fill(5),
        tasks: build(),
    };
    const draft = initialDraft(view);
    draft.tasks[0].minutes = 20;
    expect(validatePlacements(view, draft)).toBeNull();
    expect(dailyLoads(draft)[0].over).toBe(15);
    expect(balanceWeek(view, draft).tasks).toEqual(draft.tasks);
    draft.tasks[0].date = dates[1];
    expect(validatePlacements(view, draft)).toBe("locked");
});
