import { expect, test } from "bun:test";
import { DateTime } from "luxon";
import { assessmentVerses } from "../src/features/memorization/progress";
import {
    dueRevisionDate,
    generateRevisionSchedule,
    revisionCoverage,
    revisionSettingsSchema,
    weekBounds,
    weekCalendar,
    weekPeerAtoms,
} from "../src/features/revision/schedule";

// Two ayahs per quarter make partial coverage and omitted gaps observable.
export const catalogue = {
    hafs: Array.from({ length: 48 }, (_, i) => ({
        surahNumber: 2,
        ayahNumber: i + 1,
        hizb: Math.ceil((i + 1) / 8),
        quarter: Math.ceil((i + 1) / 2),
        page: 1,
        atoms: [`a${i + 1}`],
    })),
};
catalogue.warsh = catalogue.hafs.map((v) => ({ ...v }));
const settings = {
    days: [1, 2, 3, 4, 5],
    quartersPerDay: 2,
    timezone: "Africa/Casablanca",
    riwayah: "hafs",
    reminderTime: null,
};
const schedule = (extra = {}) =>
    generateRevisionSchedule({
        catalogue,
        settings,
        completedHizbs: [1, 3, 6],
        assessments: [],
        history: [],
        weekStart: "2026-09-28",
        fromDate: "2026-09-28",
        ...extra,
    });
const event = (start, end, extra = {}) => ({
    id: crypto.randomUUID(),
    riwayah: "hafs",
    method: "self",
    outcome: "confirmed",
    startSurahNumber: 2,
    startAyahNumber: start,
    endSurahNumber: 2,
    endAyahNumber: end,
    createdAt: new Date("2026-09-29T12:00:00Z"),
    ...extra,
});
const quarters = (rows) => rows.flatMap((s) => s.quarters);

test("only completed hizbs, native quarters, no gaps, capped workload, stable output", () => {
    const result = schedule();
    expect(result).toEqual(schedule());
    expect(quarters(result)).toHaveLength(10);
    expect(new Set(quarters(result)).size).toBe(10);
    for (const row of result) {
        const verses = assessmentVerses(catalogue, { ...row, riwayah: "hafs" });
        expect(verses.every((v) => [1, 3, 6].includes(v.hizb))).toBe(true);
        expect(verses.length).toBe(row.quarters.length * 2);
    }
    for (const day of new Set(result.map((r) => r.scheduledDate)))
        expect(
            quarters(result.filter((r) => r.scheduledDate === day)).length,
        ).toBeLessThanOrEqual(2);
    expect(schedule({ completedHizbs: [] })).toEqual([]);
    expect(quarters(schedule({ completedHizbs: [1] }))).toEqual([1, 2, 3, 4]);
});
test("midweek activation schedules only remaining selected days", () => {
    expect(
        schedule({ fromDate: "2026-10-01" }).map((r) => r.scheduledDate),
    ).toEqual(["2026-10-01", "2026-10-02"]);
    expect(schedule({ fromDate: "2026-10-03" })).toEqual([]);
});
test("unreviewed passages rotate even when missed sessions accumulate", () => {
    const limited = { ...settings, days: [1], quartersPerDay: 2 };
    const history = [];
    const seen = new Set();
    for (let week = 0; week < 12; week++) {
        const weekStart = DateTime.fromISO("2026-09-28")
            .plus({ weeks: week })
            .toISODate();
        const rows = schedule({
            settings: limited,
            history,
            weekStart,
            fromDate: weekStart,
        });
        expect(quarters(rows)).toHaveLength(2);
        for (const q of quarters(rows)) seen.add(q);
        history.push(
            ...rows.map((r) => ({
                ...r,
                weekStart,
                timezone: limited.timezone,
                riwayah: "hafs",
                completedAt: null,
                outcome: null,
            })),
        );
    }
    expect(seen.size).toBe(12);
});
test("difficult passages get priority without consuming the full weekly budget", () => {
    const rows = schedule({
        settings: { ...settings, days: [1], quartersPerDay: 2 },
        assessments: [event(41, 48, { outcome: "needs_revision" })],
    });
    expect(quarters(rows)).toEqual([1, 21]);
    const cleared = schedule({
        settings: { ...settings, days: [1], quartersPerDay: 2 },
        assessments: [
            event(41, 48, { outcome: "needs_revision" }),
            event(41, 48, { createdAt: new Date("2026-09-30T12:00:00Z") }),
        ],
    });
    expect(quarters(cleared)).toEqual([1, 2]);
});
test("native reading boundaries are used, including merged and split ayahs", () => {
    const native = {
        hafs: catalogue.hafs,
        warsh: [
            { ...catalogue.warsh[0], atoms: ["a1", "a2"] },
            ...catalogue.warsh
                .slice(2)
                .map((v) => ({ ...v, ayahNumber: v.ayahNumber - 1 })),
        ],
    };
    const rows = schedule({
        catalogue: native,
        settings: {
            ...settings,
            riwayah: "warsh",
            quartersPerDay: 1,
            days: [1],
        },
    });
    expect(rows[0].endAyahNumber).toBe(1);
    const range = { ...rows[0], riwayah: "warsh", completedAt: null };
    const partial = weekPeerAtoms(
        native,
        [event(1, 1, { method: "peer" })],
        "2026-09-28",
        "Africa/Casablanca",
    );
    expect(revisionCoverage(native, range, partial).done).toBe(false);
    const full = weekPeerAtoms(
        native,
        [event(1, 2, { method: "peer" })],
        "2026-09-28",
        "Africa/Casablanca",
    );
    expect(revisionCoverage(native, range, full).done).toBe(true);
});
test("group credit is limited to confirmed reviews within the local week", () => {
    const range = { ...event(1, 4), completedAt: null };
    const peer = weekPeerAtoms(
        catalogue,
        [
            event(1, 1, { method: "peer" }),
            event(2, 2),
            event(3, 3, { method: "peer", outcome: "needs_revision" }),
            event(4, 4, {
                method: "peer",
                createdAt: new Date("2026-09-27T22:59:59Z"),
            }),
        ],
        "2026-09-28",
        "Africa/Casablanca",
    );
    const result = revisionCoverage(catalogue, range, peer);
    expect(result.peer).toBe(1);
    expect(result.remaining.map((v) => v.ayahNumber)).toEqual([2, 3, 4]);
    expect(result.done).toBe(false);
    expect(
        revisionCoverage(catalogue, { ...range, completedAt: new Date() }, peer)
            .done,
    ).toBe(true);
});
test("weeks follow local Mondays and daylight saving boundaries", () => {
    expect(
        weekCalendar(new Date("2026-09-27T23:30:00Z"), "Africa/Casablanca")
            .weekStart,
    ).toBe("2026-09-28");
    const bounds = weekBounds("2026-03-02", "America/New_York");
    expect(bounds.end - bounds.start).toBe(167 * 60 * 60 * 1000);
});
test("settings reject invalid workloads, weekdays, timezones and reminder times", () => {
    expect(
        revisionSettingsSchema.parse({ ...settings, days: [5, 1, 1] }).days,
    ).toEqual([1, 5]);
    for (const invalid of [
        { days: [] },
        { days: [0] },
        { days: [8] },
        { quartersPerDay: 3 },
        { timezone: "Mars/Unknown" },
        { riwayah: "unknown" },
        { reminderTime: "24:00" },
    ])
        expect(
            revisionSettingsSchema.safeParse({ ...settings, ...invalid })
                .success,
        ).toBe(false);
});
test("reminders require opt-in and are sent only within a bounded local-time window", () => {
    const now = new Date("2026-10-01T18:05:00Z");
    expect(dueRevisionDate("19:00", "Africa/Casablanca", now)).toBe(
        "2026-10-01",
    );
    for (const time of [null, "19:10", "18:00", "broken"])
        expect(dueRevisionDate(time, "Africa/Casablanca", now)).toBeNull();
});

test("a timezone change across the date line preserves a usable week until the next Monday", async () => {
    const { revisionWeekEnd } = await import(
        "../src/features/revision/schedule"
    );
    const old = weekBounds("2026-09-28", "Pacific/Kiritimati");
    const west = weekBounds("2026-09-28", "Pacific/Honolulu");
    expect(
        revisionWeekEnd("2026-09-28", "Pacific/Kiritimati", "Pacific/Honolulu"),
    ).toBe(west.end);
    expect(west.end - old.end).toBe(24 * 60 * 60 * 1000);
    expect(
        revisionWeekEnd("2026-09-28", "Pacific/Honolulu", "Pacific/Kiritimati"),
    ).toBe(west.end);
});
