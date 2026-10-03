import { expect, test } from "bun:test";
import { assessmentVerses } from "../src/features/memorization/progress";
import { buildRevisionRotation } from "../src/features/revision/rotation";

const settings = {
    days: [1, 2, 4, 5],
    quartersPerDay: 1,
    timezone: "Africa/Casablanca",
    riwayah: "warsh",
    reminderTime: null,
};
const part = (surah, start, end, quarter) =>
    Array.from({ length: end - start + 1 }, (_, i) => ({
        surahNumber: surah,
        ayahNumber: start + i,
        quarter,
        hizb: Math.ceil(quarter / 4),
        page: 1,
        atoms: [`${surah}:${start + i}`],
    }));
const verses = [
    ...part(1, 1, 7, 1),
    ...part(2, 75, 90, 5),
    ...part(2, 91, 104, 6),
    ...part(2, 141, 156, 9),
    ...part(16, 51, 70, 109),
    ...part(16, 71, 89, 110),
    ...part(16, 90, 110, 111),
];
const catalogue = { hafs: verses, warsh: verses };
const row = (surah, start, end, quarter, date, ordinal) => ({
    startSurahNumber: surah,
    startAyahNumber: start,
    endSurahNumber: surah,
    endAyahNumber: end,
    quarters: [quarter],
    scheduledDate: date,
    ordinal,
});
const current = {
    weekStart: "2026-10-05",
    timezone: settings.timezone,
    riwayah: "warsh",
    sessions: [
        row(1, 1, 7, 1, "2026-10-05", 0),
        row(16, 71, 89, 110, "2026-10-06", 1),
        row(16, 90, 110, 111, "2026-10-08", 2),
        row(16, 51, 70, 109, "2026-10-09", 3),
    ],
};
const build = (extra = {}) =>
    buildRevisionRotation({
        catalogue,
        settings,
        covered: new Set(verses.flatMap((v) => v.atoms)),
        assessments: [],
        history: [],
        current,
        today: "2026-10-03",
        ...extra,
    });
const futureRefs = (result) =>
    result.weeks.flatMap((w) =>
        w.sessions.flatMap((s) =>
            assessmentVerses(catalogue, { ...s, riwayah: "warsh" }).map(
                (v) => `${v.surahNumber}:${v.ayahNumber}`,
            ),
        ),
    );

test("the screenshot's partial Baqarah ranges all appear after the saved Fatihah and Nahl sessions", () => {
    const result = build();
    expect(result.scheduledAyahs).toBe(67);
    expect(result.remainingAyahs).toBe(46);
    expect(result.totalAyahs).toBe(113);
    expect(futureRefs(result)).toEqual(
        verses.filter((v) => v.surahNumber === 2).map((v) => v.atoms[0]),
    );
    expect(
        result.hizbs
            .filter((h) => [2, 3].includes(h.number))
            .every((h) => h.nextDate && h.scheduledAyahs === 0),
    ).toBe(true);
    for (const w of result.weeks)
        for (const date of new Set(w.sessions.map((s) => s.scheduledDate)))
            expect(
                new Set(
                    w.sessions
                        .filter((s) => s.scheduledDate === date)
                        .flatMap((s) => s.quarters),
                ).size,
            ).toBeLessThanOrEqual(1);
    expect(result.weeks[0].weekStart).toBe("2026-10-12");
});
test("forecast includes newly added ayahs inside an already scheduled quarter", () => {
    const changed = {
        ...current,
        sessions: current.sessions.map((s, i) =>
            i ? s : { ...s, endAyahNumber: 3 },
        ),
    };
    const result = build({ current: changed });
    expect(futureRefs(result)).toEqual(
        expect.arrayContaining(["1:4", "1:5", "1:6", "1:7"]),
    );
    expect(result.scheduledAyahs + result.remainingAyahs).toBe(
        result.totalAyahs,
    );
});
test("removed memorization disappears from the forecast and current inputs stay unchanged", () => {
    const before = structuredClone(current);
    const covered = new Set(
        verses.filter((v) => v.surahNumber !== 2).flatMap((v) => v.atoms),
    );
    const result = build({ covered });
    expect(result.weeks).toEqual([]);
    expect(result.hizbs.map((h) => h.number)).toEqual([1, 28]);
    expect(current).toEqual(before);
});
test("estimated weeks begin after the carried queue and use changed study days", () => {
    const shifted = {
        ...current,
        sessions: current.sessions.map((s) => ({
            ...s,
            scheduledDate: "2026-10-20",
        })),
    };
    const result = build({
        current: shifted,
        settings: { ...settings, days: [4] },
    });
    expect(result.weeks[0].sessions[0].scheduledDate).toBe("2026-10-22");
});
test("no revision days keeps all coverage visible without inventing dates", () => {
    const result = build({ settings: { ...settings, days: [] } });
    expect(result.weeks).toEqual([]);
    expect(result.remainingAyahs).toBe(46);
    expect(result.hizbs.find((h) => h.number === 2).nextDate).toBeNull();
});
test("a full Quran at one quarter per week has a bounded, non-repeating complete rotation", () => {
    const all = Array.from({ length: 240 }, (_, q) =>
        part(1, q * 25 + 1, (q + 1) * 25, q + 1),
    ).flat();
    const result = build({
        catalogue: { hafs: all, warsh: all },
        covered: new Set(all.flatMap((v) => v.atoms)),
        current: undefined,
        settings: { ...settings, days: [1] },
    });
    expect(result.weeks).toHaveLength(240);
    expect(
        result.weeks.flatMap((w) => w.sessions.flatMap((s) => s.quarters)),
    ).toEqual(Array.from({ length: 240 }, (_, i) => i + 1));
    expect(
        result.weeks
            .flatMap((w) => w.sessions)
            .reduce((n, s) => n + s.ayahs, 0),
    ).toBe(6000);
});
