import { expect, test } from "bun:test";
import { reconcileRevisionSessions } from "../src/features/revision/reconcile";

const verses = Array.from({ length: 32 }, (_, i) => ({
    surahNumber: 2,
    ayahNumber: i + 1,
    hizb: Math.floor(i / 8) + 1,
    quarter: Math.floor(i / 2) + 1,
    page: 1,
    atoms: [`a${i + 1}`],
}));
const catalogue = { hafs: verses, warsh: verses };
const week = {
    weekStart: "2026-10-05",
    days: [1, 2, 4, 5],
    quartersPerDay: 4,
    timezone: "UTC",
    riwayah: "hafs",
    reminderTime: null,
};
const session = (id, start, end, options = {}) => ({
    id,
    ordinal: 0,
    scheduledDate: "2026-10-05",
    startSurahNumber: 2,
    endSurahNumber: 2,
    startAyahNumber: start,
    endAyahNumber: end,
    quarters: [...new Set(verses.slice(start - 1, end).map((v) => v.quarter))],
    completedAt: null,
    progressSurahNumber: null,
    progressAyahNumber: null,
    ...options,
});
const repair = (sessions, known, options = {}) =>
    reconcileRevisionSessions({
        catalogue,
        week,
        sessions,
        covered: new Set(known.map((n) => `a${n}`)),
        assessments: [],
        history: [],
        now: new Date("2026-10-03T12:00:00Z"),
        ...options,
    });
const numbers = (start, end) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);
const assigned = (result) =>
    result.replacements.flatMap((s) =>
        numbers(s.startAyahNumber, s.endAyahNumber),
    );

test("unchanged memorization does not rebuild sessions or reset reading progress", () => {
    const rows = [
        session("keep", 1, 8, {
            progressSurahNumber: 2,
            progressAyahNumber: 3,
        }),
    ];
    expect(repair(rows, numbers(1, 16))).toEqual({
        removed: [],
        replacements: [],
    });
});
test("removing the first juz replaces only its pending slots with other known passages", () => {
    const rows = [
        session("first", 1, 8),
        session("second", 9, 16, { ordinal: 1, scheduledDate: "2026-10-06" }),
        session("keep", 25, 32, { ordinal: 2, scheduledDate: "2026-10-08" }),
    ];
    const result = repair(rows, numbers(17, 32));
    expect(result.removed).toEqual(["first", "second"]);
    expect(assigned(result)).toEqual(numbers(17, 24));
    expect(
        result.replacements.every((s) => s.scheduledDate === "2026-10-05"),
    ).toBe(true);
    expect(new Set(assigned(result)).size).toBe(assigned(result).length);
});
test("partially memorized sessions split at gaps and preserve reading progress in retained ayahs", () => {
    const result = repair(
        [
            session("split", 1, 8, {
                progressSurahNumber: 2,
                progressAyahNumber: 5,
            }),
        ],
        [1, 2, 5, 6, 8],
    );
    expect(result.removed).toEqual(["split"]);
    expect(
        result.replacements.map((s) => [
            s.startAyahNumber,
            s.endAyahNumber,
            s.progressAyahNumber,
        ]),
    ).toEqual([
        [1, 2, 2],
        [5, 6, 5],
        [8, 8, null],
    ]);
});
test("a partially occupied day is refilled only within its original quarter budget", () => {
    const result = repair([session("trim", 1, 8)], [1, 2, ...numbers(17, 32)]);
    expect(assigned(result)).toEqual([1, 2, ...numbers(17, 22)]);
    expect(new Set(result.replacements.flatMap((s) => s.quarters)).size).toBe(
        4,
    );
});
test("completed sessions remain history and are not assigned again", () => {
    const result = repair(
        [
            session("done", 1, 8, {
                completedAt: new Date("2026-10-05T09:00:00Z"),
            }),
            session("removed", 9, 16, {
                ordinal: 1,
                scheduledDate: "2026-10-06",
            }),
        ],
        numbers(1, 8),
    );
    expect(result).toEqual({ removed: ["removed"], replacements: [] });
});
test("no remaining memorization clears pending sessions without inventing replacements", () => {
    expect(repair([session("remove", 1, 8)], [])).toEqual({
        removed: ["remove"],
        replacements: [],
    });
    expect(repair([], [])).toEqual({ removed: [], replacements: [] });
});
test("an empty upcoming batch can be restored when memorization is added", () => {
    const result = repair([], numbers(1, 8));
    expect(assigned(result)).toEqual(numbers(1, 8));
    expect(result.replacements[0].scheduledDate).toBe("2026-10-05");
});
test("refilling a day cannot assign another part of a retained quarter on a different day", () => {
    const result = repair(
        [
            session("retained", 1, 1),
            session("removed", 3, 4, {
                ordinal: 1,
                scheduledDate: "2026-10-06",
            }),
        ],
        [1, 2, 5, 6],
    );
    expect(assigned(result)).toEqual([5, 6]);
    expect(result.replacements[0].quarters).toEqual([3]);
});
test("repairs use the saved reading and are idempotent", () => {
    const warsh = verses.map((v) => ({ ...v, ayahNumber: v.ayahNumber + 100 }));
    const options = {
        catalogue: { hafs: verses, warsh },
        week: { ...week, riwayah: "warsh" },
    };
    const result = repair(
        [session("warsh", 1, 8, { startAyahNumber: 101, endAyahNumber: 108 })],
        [1, 2, 5, 6],
        options,
    );
    expect(
        result.replacements.map((s) => [s.startAyahNumber, s.endAyahNumber]),
    ).toEqual([
        [101, 102],
        [105, 106],
    ]);
    const saved = result.replacements.map((s, i) => ({
        ...s,
        id: String(i),
        completedAt: null,
    }));
    expect(repair(saved, [1, 2, 5, 6], options)).toEqual({
        removed: [],
        replacements: [],
    });
});
