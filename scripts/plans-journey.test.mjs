import { expect, test } from "bun:test";
import { plansView, todayActivityHref } from "../src/features/plans/navigation";
import { practiceIsDueToday } from "../src/features/plans/today-practice";

test("legacy settings remain in My plans while readers belong to Today", () => {
    for (const route of [
        "/plans",
        "/plans/",
        "/wird",
        "/practice",
        "/memorization/plan",
        "/memorization/revision",
    ])
        expect(plansView(route)).toBe("myPlans");
    for (const route of [
        "/plans/today",
        "/wird/read",
        "/practice/memorization/session/read",
        "/practice/revision/session/read",
        "/practice/personal/read",
    ])
        expect(plansView(route)).toBe("today");
    expect(plansView("/weekly")).toBe("week");
    for (const route of [
        "/memorization",
        "/memorization/report",
        "/memorization/mistakes",
        "/quran",
        "/quran/surah/18",
        "/practice-other",
        "/weekly-report",
    ])
        expect(plansView(route)).toBeNull();
});

test("Quran activity links preserve reader position and carry only a fixed return context", () => {
    expect(todayActivityHref("/quran/surah/18")).toBe(
        "/quran/surah/18?from=today",
    );
    expect(todayActivityHref("/quran/page/42?riwayah=warsh#ayah-20")).toBe(
        "/quran/page/42?riwayah=warsh&from=today#ayah-20",
    );
    expect(todayActivityHref("/quran/surah/67?from=elsewhere")).toBe(
        "/quran/surah/67?from=today",
    );
    for (const href of [
        "https://lessons.example/quran/surah/18",
        "//lessons.example/quran/surah/18",
        "/wird/read",
        "/practice/session/read",
        "/quran/search?q=18",
    ])
        expect(todayActivityHref(href)).toBe(href);
});

const ready = { status: "in_progress", dueAt: null, plannedDate: null };
const due = (item, zone = "Africa/Casablanca") =>
    practiceIsDueToday(item, "2026-10-08", zone);

test("unscheduled and overdue practice is available in Today without pulling future sessions forward", () => {
    expect(due(ready)).toBe(true);
    expect(due({ ...ready, status: "needs_revision" })).toBe(true);
    expect(due({ ...ready, status: "not_completed" })).toBe(true);
    expect(due({ ...ready, plannedDate: "2026-10-07" })).toBe(true);
    expect(due({ ...ready, plannedDate: "2026-10-08" })).toBe(true);
    expect(due({ ...ready, plannedDate: "2026-10-09" })).toBe(false);
    for (const status of ["completed", "submitted"])
        expect(due({ ...ready, status, plannedDate: "2026-10-08" })).toBe(
            false,
        );
});

test("Today respects local due dates and the earlier of a scheduled day and a deadline", () => {
    const tomorrowUTC = new Date("2026-10-09T00:30:00Z");
    expect(due({ ...ready, dueAt: tomorrowUTC }, "America/Los_Angeles")).toBe(
        true,
    );
    expect(due({ ...ready, dueAt: tomorrowUTC })).toBe(false);
    expect(
        due({ ...ready, plannedDate: "2026-10-08", dueAt: tomorrowUTC }),
    ).toBe(true);
    expect(
        due({
            ...ready,
            plannedDate: "2026-10-12",
            dueAt: new Date("2026-10-08T10:00:00Z"),
        }),
    ).toBe(true);
    expect(
        due({ ...ready, plannedDate: "2026-10-10", dueAt: tomorrowUTC }),
    ).toBe(false);
});
