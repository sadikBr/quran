import { expect, test } from "bun:test";
import { DateTime } from "luxon";
import { generateMemorizationSchedule } from "../src/features/learning/schedule";
import { generateLimitedMemorizationSchedule } from "../src/features/learning/weekly-capacity";
import { assessmentVerses } from "../src/features/memorization/progress";

// Synthetic boundaries: surah 12 starts in hizb 59 and ends in hizb 60.
// Hizb 60 must pull in its beginning before proceeding to surahs 13 and 14.
const part = (surahNumber, start, end, quarter) =>
    Array.from({ length: end - start + 1 }, (_, i) => ({
        surahNumber,
        ayahNumber: start + i,
        quarter,
        hizb: Math.ceil(quarter / 4),
        page: 1,
        atoms: [`${surahNumber}:${start + i}`],
    }));
const verses = [
    ...part(10, 1, 4, 232),
    ...part(11, 1, 4, 233),
    ...part(11, 5, 8, 234),
    ...part(11, 9, 12, 235),
    ...part(12, 1, 4, 236),
    ...part(12, 5, 8, 237),
    ...part(12, 9, 12, 238),
    ...part(13, 1, 4, 239),
    ...part(14, 1, 4, 240),
];
const catalogue = { hafs: verses, warsh: verses };
const settings = {
    quartersPerWeek: 1,
    direction: "backward",
    timezone: "UTC",
    riwayah: "hafs",
};
const refs = (rows, riwayah = "hafs") =>
    rows.flatMap((range) =>
        assessmentVerses(catalogue, { ...range, riwayah }).map(
            (v) => v.atoms[0],
        ),
    );
const generate = (extra = {}) =>
    generateMemorizationSchedule({
        catalogue,
        settings,
        days: [1, 4],
        covered: new Set(),
        weekStart: "2026-10-05",
        fromDate: "2026-10-05",
        ...extra,
    });
const expectedOrder = [12, 13, 14, 11, 10].flatMap((surah) =>
    verses.filter((v) => v.surahNumber === surah).map((v) => v.atoms[0]),
);

test("the last hizb starts at its opening surah's beginning, even in the preceding hizb", () => {
    const rows = generate();
    expect(refs(rows)).toEqual(["12:1", "12:2", "12:3", "12:4"]);
    expect(rows.flatMap((s) => s.quarters)).toEqual([236, 236]);
});

test("a rub boundary never makes a long surah progress backwards across weeks", () => {
    const covered = new Set();
    const learned = [];
    for (let week = 0; week < 12; week++) {
        const date = DateTime.fromISO("2026-10-05")
            .plus({ weeks: week })
            .toISODate();
        const rows = generate({ covered, weekStart: date, fromDate: date });
        if (!rows.length) break;
        expect(
            new Set(rows.flatMap((s) => s.quarters)).size,
        ).toBeLessThanOrEqual(1);
        const next = refs(rows);
        expect(next).toEqual(
            expectedOrder.slice(learned.length, learned.length + next.length),
        );
        for (const reference of next) covered.add(reference);
        learned.push(...next);
    }
    expect(learned).toEqual(expectedOrder);
    expect(generate({ covered })).toEqual([]);
});

test("complete a surah before starting the next one, then return to the previous hizb", () => {
    const rows = generate({
        settings: { ...settings, quartersPerWeek: 28 },
        days: [1],
    });
    expect(refs(rows)).toEqual(expectedOrder);
    // The forward passage in hizb 60 and its opening surah is followed by
    // a separate earlier passage; a reader range must never bridge that jump.
    expect(rows.map((s) => [s.startSurahNumber, s.endSurahNumber])).toEqual([
        [12, 14],
        [11, 11],
        [10, 10],
    ]);
});

test("known tails and holes cannot move a missing surah beginning behind the next surah", () => {
    const covered = new Set([
        "12:1",
        "12:2",
        "12:9",
        "12:10",
        "12:11",
        "12:12",
    ]);
    expect(refs(generate({ covered }))).toEqual(["12:3", "12:4"]);
    covered.add("12:3");
    covered.add("12:4");
    covered.add("12:6");
    expect(refs(generate({ covered }))).toEqual(["12:5", "12:7", "12:8"]);
});

test("an already charged later quarter cannot bypass an unmemorized beginning", () => {
    const usage = new Map([["2026-10-05", new Set([237])]]);
    const rows = generate({ usedQuarters: usage.get("2026-10-05") });
    expect(rows).toEqual([]);
    const next = generateLimitedMemorizationSchedule({
        catalogue,
        settings,
        days: [1, 4],
        covered: new Set(),
        fromDate: "2026-10-05",
        usage,
    });
    expect(next.weekStart).toBe("2026-10-12");
    expect(refs(next.sessions)).toEqual(["12:1", "12:2", "12:3", "12:4"]);
    expect(
        refs(
            generate({
                settings: { ...settings, quartersPerWeek: 2 },
                usedQuarters: new Set([237]),
            }),
        ),
    ).toEqual(["12:1", "12:2", "12:3", "12:4", "12:5", "12:6", "12:7", "12:8"]);
});

test("forward direction still follows native Quran order", () => {
    expect(
        refs(
            generate({
                settings: {
                    ...settings,
                    direction: "forward",
                    quartersPerWeek: 28,
                },
            }),
        ),
    ).toEqual(verses.map((v) => v.atoms[0]));
});

for (const riwayah of ["hafs", "warsh"]) {
    test(`${riwayah}: every generated batch is a prefix of the missing surah sequence at different weekly amounts`, () => {
        for (const amount of [1, 2, 4, 8]) {
            for (let cut = 0; cut < expectedOrder.length; cut++) {
                const known = new Set(expectedOrder.slice(0, cut));
                // Also model scattered known ayahs beyond the learned prefix.
                expectedOrder.forEach((reference, i) => {
                    if (i % 5 === 0) known.add(reference);
                });
                const remaining = expectedOrder.filter(
                    (reference) => !known.has(reference),
                );
                const rows = generate({
                    settings: { ...settings, riwayah, quartersPerWeek: amount },
                    covered: known,
                });
                const actual = refs(rows, riwayah);
                expect(actual).toEqual(remaining.slice(0, actual.length));
                expect(new Set(actual).size).toBe(actual.length);
                expect(
                    new Set(rows.flatMap((s) => s.quarters)).size,
                ).toBeLessThanOrEqual(amount);
                if (remaining.length) expect(actual.length).toBeGreaterThan(0);
            }
        }
    });
}
