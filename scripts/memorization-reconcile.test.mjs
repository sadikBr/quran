import { expect, test } from "bun:test";
import { reconcileMemorizationSessions } from "../src/features/learning/reconcile";

const verses = Array.from({ length: 16 }, (_, i) => ({
    surahNumber: 2,
    ayahNumber: i + 1,
    quarter: Math.floor(i / 8) + 1,
    hizb: 1,
    page: 1,
    atoms: [`a${i + 1}`],
}));
const catalogue = { hafs: verses, warsh: verses };
const range = (start, end, ordinal = 0) => ({
    scheduledDate: "2026-10-05",
    ordinal,
    quarters: [Math.ceil(start / 8)],
    startSurahNumber: 2,
    startAyahNumber: start,
    endSurahNumber: 2,
    endAyahNumber: end,
});
const saved = (start, end, extra = {}) => ({
    ...range(start, end),
    id: "old",
    completedAt: null,
    progressSurahNumber: 2,
    progressAyahNumber: 5,
    ...extra,
});

test("unrelated corrections preserve the saved queue and reading positions", () => {
    expect(
        reconcileMemorizationSessions(
            catalogue,
            "hafs",
            [saved(1, 8)],
            [{ ...range(1, 4), scheduledDate: "2026-10-06" }, range(5, 8, 1)],
        ),
    ).toBeNull();
});
test("corrections remove known gaps, preserve safe bookmarks, and expire changed reader IDs", () => {
    const repair = reconcileMemorizationSessions(
        catalogue,
        "hafs",
        [saved(1, 8)],
        [range(1, 2), range(4, 8, 1)],
    );
    expect(repair.removed).toEqual(["old"]);
    expect(repair.replacements.map((s) => s.progressAyahNumber)).toEqual([
        2, 5,
    ]);
    expect(repair.replacements.every((s) => s.id !== "old")).toBe(true);
});
test("earlier removed memorization becomes pending without borrowing a later bookmark", () => {
    const repair = reconcileMemorizationSessions(
        catalogue,
        "hafs",
        [saved(4, 8)],
        [range(1, 8)],
    );
    expect(repair.replacements[0].progressAyahNumber).toBeNull();
    expect(repair.replacements[0].id).not.toBe("old");
});
test("completed sessions are never removed and unchanged pending ranges retain their IDs", () => {
    const sessions = [
        saved(1, 4, { id: "done", completedAt: new Date(), ordinal: 0 }),
        saved(5, 8, { id: "keep", ordinal: 1 }),
        saved(9, 16, { id: "remove", ordinal: 2 }),
    ];
    const repair = reconcileMemorizationSessions(catalogue, "hafs", sessions, [
        range(5, 8),
        range(10, 16),
    ]);
    expect(repair.removed).toEqual(["keep", "remove"]);
    expect(repair.replacements[0].id).toBe("keep");
    expect(repair.replacements[0].ordinal).toBeGreaterThan(2);
});
test("full coverage empties only unconfirmed sessions and newly removed coverage reopens an empty queue", () => {
    expect(
        reconcileMemorizationSessions(catalogue, "hafs", [saved(1, 8)], [])
            .replacements,
    ).toEqual([]);
    expect(
        reconcileMemorizationSessions(catalogue, "hafs", [], [range(1, 8)])
            .replacements,
    ).toHaveLength(1);
});
