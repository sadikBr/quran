import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as orm from "drizzle-orm";
import { DateTime } from "luxon";
import * as schema from "../src/drizzle/schema";
import { generateMemorizationSchedule } from "../src/features/learning/schedule";
import { generateRevisionSchedule } from "../src/features/revision/schedule";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const { regenerationCalendar } = loadTypeScript(
    "src/features/learning/server/plan-lifecycle.ts",
    {
        "server-only": {},
        "node:crypto": { createHash },
        "drizzle-orm": orm,
        luxon: { DateTime },
        "@/drizzle/schema": schema,
    },
);
const verses = Array.from({ length: 32 }, (_, i) => ({
    surahNumber: 2,
    ayahNumber: i + 1,
    hizb: 1,
    quarter: Math.floor(i / 8) + 1,
    page: 1,
    atoms: [`a${i + 1}`],
}));
const catalogue = { hafs: verses, warsh: verses };
const days = [1, 2, 4, 5];

test("regeneration after the screenshot's Saturday rebuilds four sessions on the new weekdays", () => {
    const calendar = regenerationCalendar(
        "2026-10-03",
        days,
        "Africa/Casablanca",
    );
    expect(calendar).toEqual({
        weekStart: "2026-10-05",
        fromDate: "2026-10-05",
    });
    const revision = generateRevisionSchedule({
        catalogue,
        settings: {
            days,
            quartersPerDay: 1,
            timezone: "Africa/Casablanca",
            riwayah: "hafs",
            reminderTime: null,
        },
        completedHizbs: [1],
        assessments: [],
        history: [],
        ...calendar,
    });
    const memorization = generateMemorizationSchedule({
        catalogue,
        settings: {
            quartersPerWeek: 1,
            direction: "forward",
            timezone: "Africa/Casablanca",
            riwayah: "hafs",
        },
        days,
        covered: new Set(),
        ...calendar,
    });
    for (const rows of [revision, memorization])
        expect(rows.map((s) => s.scheduledDate)).toEqual([
            "2026-10-05",
            "2026-10-06",
            "2026-10-08",
            "2026-10-09",
        ]);
    expect(
        memorization.reduce(
            (count, s) => count + s.endAyahNumber - s.startAyahNumber + 1,
            0,
        ),
    ).toBe(8);
});
test("regeneration respects remaining days, year boundaries, and a day occupied by completed work", () => {
    expect(regenerationCalendar("2026-10-06", days, "UTC")).toEqual({
        weekStart: "2026-10-05",
        fromDate: "2026-10-06",
    });
    expect(regenerationCalendar("2026-10-10", days, "UTC")).toEqual({
        weekStart: "2026-10-12",
        fromDate: "2026-10-12",
    });
    expect(regenerationCalendar("2026-12-31", [1], "UTC")).toEqual({
        weekStart: "2027-01-04",
        fromDate: "2027-01-04",
    });
    expect(regenerationCalendar("2026-10-03", [], "UTC")).toEqual({
        weekStart: "2026-09-28",
        fromDate: "2026-10-03",
    });
});
test("regeneration omits fully reviewed quarters without losing partial quarters", () => {
    const reviewed = new Set(verses.slice(0, 9).flatMap((v) => v.atoms));
    const rows = generateRevisionSchedule({
        catalogue,
        settings: {
            days,
            quartersPerDay: 1,
            timezone: "UTC",
            riwayah: "hafs",
            reminderTime: null,
        },
        completedHizbs: [1],
        assessments: [],
        history: [],
        reviewed,
        weekStart: "2026-10-05",
        fromDate: "2026-10-05",
    });
    expect(rows.flatMap((s) => s.quarters)).toEqual([2, 3, 4]);
});
