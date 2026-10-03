import { expect, test } from "bun:test";
import {
    generateMemorizationSchedule,
    learningScheduleSchema,
    memorizationSettingsSchema,
    memorizedAtoms,
} from "../src/features/learning/schedule";
import { assessmentVerses } from "../src/features/memorization/progress";

const verses = Array.from({ length: 56 }, (_, i) => ({
    surahNumber: 2,
    ayahNumber: i + 1,
    hizb: Math.floor(i / 28) + 1,
    quarter: Math.floor(i / 7) + 1,
    page: 1,
    atoms: [`a${i + 1}`],
}));
const catalogue = { hafs: verses, warsh: verses.map((v) => ({ ...v })) };
const settings = {
    quartersPerWeek: 1,
    direction: "forward",
    timezone: "Africa/Casablanca",
    riwayah: "hafs",
};
const schedule = (extra = {}) =>
    generateMemorizationSchedule({
        catalogue,
        settings,
        days: [1, 3, 5],
        covered: new Set(),
        weekStart: "2026-09-28",
        fromDate: "2026-09-28",
        ...extra,
    });
const scheduledVerses = (rows, riwayah = "hafs") =>
    rows.flatMap((r) => assessmentVerses(catalogue, { ...r, riwayah }));
const event = (start, end, extra = {}) => ({
    id: crypto.randomUUID(),
    riwayah: "hafs",
    method: "peer",
    outcome: "confirmed",
    startSurahNumber: 2,
    startAyahNumber: start,
    endSurahNumber: 2,
    endAyahNumber: end,
    createdAt: new Date(),
    ...extra,
});
test("one quarter is split across all days in whole ayahs, with no progress credit", () => {
    const covered = new Set();
    const result = schedule({ covered });
    expect(result.map((s) => s.scheduledDate)).toEqual([
        "2026-09-28",
        "2026-09-30",
        "2026-10-02",
    ]);
    expect(result.map((s) => s.endAyahNumber - s.startAyahNumber + 1)).toEqual([
        3, 2, 2,
    ]);
    expect(scheduledVerses(result).map((v) => v.ayahNumber)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(covered.size).toBe(0);
    expect(schedule()).toEqual(result);
});
test("baseline and confirmed circle passages are skipped without spanning gaps", () => {
    const covered = memorizedAtoms(
        catalogue,
        "hafs",
        [1],
        [event(31, 32), event(35, 35, { outcome: "needs_revision" })],
    );
    const result = schedule({ covered });
    expect(scheduledVerses(result).map((v) => v.ayahNumber)).toEqual([
        29, 30, 33, 34, 35,
    ]);
    expect(
        result.some((r) => r.startAyahNumber <= 31 && r.endAyahNumber >= 31),
    ).toBe(false);
});
test("completion moves the next week's target forward; missed passages remain eligible", () => {
    expect(scheduledVerses(schedule()).map((v) => v.ayahNumber)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
    ]);
    const covered = memorizedAtoms(
        catalogue,
        "hafs",
        [],
        [event(1, 7, { method: "self" })],
    );
    expect(
        scheduledVerses(
            schedule({
                covered,
                weekStart: "2026-10-05",
                fromDate: "2026-10-05",
            }),
        ).map((v) => v.ayahNumber),
    ).toEqual([8, 9, 10, 11, 12, 13, 14]);
    expect(
        scheduledVerses(
            schedule({ weekStart: "2026-10-05", fromDate: "2026-10-05" }),
        ).map((v) => v.ayahNumber),
    ).toEqual([1, 2, 3, 4, 5, 6, 7]);
});
test("backward plans preserve verse order within each quarter and never cross reversed boundaries", () => {
    const result = schedule({
        settings: {
            ...settings,

            quartersPerWeek: 2,
            direction: "backward",
        },
        days: [1],
    });
    expect(result.map((r) => r.quarters)).toEqual([[8], [7]]);
    expect(scheduledVerses(result).map((v) => v.ayahNumber)).toEqual([
        50, 51, 52, 53, 54, 55, 56, 43, 44, 45, 46, 47, 48, 49,
    ]);
});
test("late activation redistributes only across remaining days and bounds at Quran end", () => {
    expect(
        schedule({ fromDate: "2026-10-01" }).map((s) => s.scheduledDate),
    ).toEqual(["2026-10-02"]);
    expect(schedule({ fromDate: "2026-10-03" })).toEqual([]);
    expect(schedule({ days: [] })).toEqual([]);
    expect(
        scheduledVerses(
            schedule({
                settings: { ...settings, quartersPerWeek: 28 },
                covered: new Set(verses.slice(0, 49).flatMap((v) => v.atoms)),
            }),
        ),
    ).toHaveLength(7);
    expect(
        schedule({ covered: new Set(verses.flatMap((v) => v.atoms)) }),
    ).toEqual([]);
});
test("reading-specific atoms require complete verse coverage", () => {
    const split = {
        hafs: [{ ...verses[0], atoms: ["first", "second"] }],
        warsh: [
            { ...verses[0], atoms: ["first"] },
            { ...verses[1], atoms: ["second"] },
        ],
    };
    const covered = memorizedAtoms(
        split,
        "hafs",
        [],
        [event(1, 1, { riwayah: "warsh" })],
    );
    expect(
        generateMemorizationSchedule({
            catalogue: split,
            settings,
            days: [1],
            covered,
            weekStart: "2026-09-28",
            fromDate: "2026-09-28",
        }),
    ).toHaveLength(1);
});
test("the grid chooses the earliest missing ayahs, ignoring a legacy manual start", () => {
    const parsed = memorizationSettingsSchema.parse({
        ...settings,
        startQuarter: 8,
    });
    expect(parsed).not.toHaveProperty("startQuarter");
    const covered = new Set(
        verses
            .filter((v) => v.ayahNumber <= 9 || v.ayahNumber === 12)
            .flatMap((v) => v.atoms),
    );
    expect(
        scheduledVerses(schedule({ settings: parsed, covered })).map(
            (v) => v.ayahNumber,
        ),
    ).toEqual([10, 11, 13, 14]);
    covered.delete("a2");
    expect(
        scheduledVerses(schedule({ settings: parsed, covered })).map(
            (v) => v.ayahNumber,
        ),
    ).toEqual([2]);
});
test("reverse plans choose the last missing surah, with normal ayah order and no known gaps", () => {
    const tail = [112, 113, 114].flatMap((surahNumber) =>
        Array.from({ length: 4 }, (_, i) => ({
            ...verses[0],
            surahNumber,
            ayahNumber: i + 1,
            quarter: 240,
            hizb: 60,
            atoms: [`${surahNumber}:${i + 1}`],
        })),
    );
    const tailCatalogue = { hafs: tail, warsh: tail };
    const rows = generateMemorizationSchedule({
        catalogue: tailCatalogue,
        settings: { ...settings, direction: "backward" },
        days: [1],
        weekStart: "2026-10-05",
        fromDate: "2026-10-05",
        covered: new Set(["114:1", "114:2", "114:3", "114:4", "113:2"]),
    });
    expect(
        rows.map((s) => [
            s.startSurahNumber,
            s.startAyahNumber,
            s.endSurahNumber,
            s.endAyahNumber,
        ]),
    ).toEqual([
        [113, 1, 113, 1],
        [113, 3, 113, 4],
        [112, 1, 112, 4],
    ]);
});
test("saved days allow overlapping activities, deduplicate weekdays, validate amount and timezone", () => {
    expect(
        learningScheduleSchema.parse({
            revisionDays: [5, 1, 1],
            memorizationDays: [1, 3],
            revision: 0,
        }).revisionDays,
    ).toEqual([1, 5]);
    expect(
        learningScheduleSchema.safeParse({
            revisionDays: [],
            memorizationDays: [],
            revision: 0,
        }).success,
    ).toBe(true);
    expect(
        learningScheduleSchema.safeParse({
            revisionDays: [8],
            memorizationDays: [1],
            revision: 0,
        }).success,
    ).toBe(false);
    expect(
        memorizationSettingsSchema.safeParse({
            ...settings,
            quartersPerWeek: 0,
        }).success,
    ).toBe(false);
    expect(
        memorizationSettingsSchema.safeParse({
            ...settings,
            quartersPerWeek: 1.5,
        }).success,
    ).toBe(false);
    expect(
        memorizationSettingsSchema.safeParse({
            ...settings,
            timezone: "bad/zone",
        }).success,
    ).toBe(false);
});
