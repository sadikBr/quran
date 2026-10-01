import { expect, test } from "bun:test";
import {
    CORRECTION_WINDOW_MS,
    calculateMemorization,
    initialCorrectionAvailable,
} from "../src/features/memorization/progress";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const verse = (ayah, atoms, hizb = 1) => ({
    surahNumber: 1,
    ayahNumber: ayah,
    hizb,
    atoms,
    page: 1,
});
const catalogue = {
    hafs: [verse(1, ["a"]), verse(2, ["b", "c"]), verse(3, ["d"], 2)],
    warsh: [
        verse(1, ["a"]),
        verse(2, ["b"]),
        verse(3, ["c"]),
        verse(4, ["d"], 2),
    ],
};
const event = (id, start, end, overrides = {}) => ({
    id,
    riwayah: "hafs",
    method: "self",
    outcome: "confirmed",
    startSurahNumber: 1,
    startAyahNumber: start,
    endSurahNumber: 1,
    endAyahNumber: end,
    createdAt: new Date(
        `2026-10-01T${String(Number(id) || 1).padStart(2, "0")}:00:00Z`,
    ),
    ...overrides,
});
const map = (
    baseline = [],
    events = [],
    reading = "hafs",
    baselineReading = "hafs",
) =>
    calculateMemorization(
        catalogue,
        reading,
        baselineReading,
        baseline,
        events,
    );

test("correction starts immediately, expires exactly at three hours, and cannot be reused", () => {
    const start = new Date("2026-10-01T10:00:00Z");
    expect(initialCorrectionAvailable(null, null, start)).toBe(false);
    expect(initialCorrectionAvailable(start, null, start)).toBe(true);
    expect(
        initialCorrectionAvailable(
            start,
            null,
            new Date(+start + CORRECTION_WINDOW_MS - 1),
        ),
    ).toBe(true);
    expect(
        initialCorrectionAvailable(
            start,
            null,
            new Date(+start + CORRECTION_WINDOW_MS),
        ),
    ).toBe(false);
    expect(initialCorrectionAvailable(start, start, start)).toBe(false);
});
test("overlapping personal and group ranges form a union, and only complete hizbs reach 100%", () => {
    const partial = map(
        [],
        [event("1", 1, 1), event("2", 1, 1, { method: "peer" })],
    );
    expect(partial[0].completed).toBe(1);
    expect(partial[0].percent).toBe(50);
    expect(partial[0].self).toBe(1);
    expect(partial[0].peer).toBe(1);
    const full = map(
        [],
        [event("1", 1, 1), event("2", 2, 2, { method: "peer" })],
    );
    expect(full[0].percent).toBe(100);
    expect(full[1].percent).toBe(0);
});
test("baseline removals preserve earned coverage, including overlapping credit", () => {
    expect(map([1], [event("1", 2, 2)])[0].percent).toBe(100);
    expect(map([], [event("1", 2, 2)])[0].percent).toBe(50);
    expect(map([1], [event("1", 1, 2)])[0].completed).toBe(2);
    expect(map([], [event("1", 1, 2)])[0].completed).toBe(2);
});
test("revision flags do not remove memorization and clear only for reconfirmed portions", () => {
    const events = [
        event("1", 1, 2),
        event("2", 1, 2, { method: "peer", outcome: "needs_revision" }),
    ];
    expect(map([], events)[0].percent).toBe(100);
    expect(map([], events)[0].needsRevision).toBe(true);
    events.push(event("3", 1, 1));
    expect(map([], events)[0].needsRevision).toBe(true);
    events.push(event("4", 2, 2));
    expect(map([], events)[0].needsRevision).toBe(false);
    expect(
        map([], [event("1", 1, 2, { outcome: "needs_revision" })])[0].completed,
    ).toBe(0);
});
test("split Warsh verses need all their segments before a Hafs verse is complete", () => {
    const first = event("1", 1, 2, { riwayah: "warsh" });
    expect(map([], [first])[0].percent).toBe(50);
    expect(
        map([], [first, event("2", 3, 3, { riwayah: "warsh" })])[0].percent,
    ).toBe(100);
    expect(map([], [event("1", 2, 2)], "warsh")[0].completed).toBe(2);
    expect(map([1], [], "warsh")[0].percent).toBe(100);
});
test("unavailable or reversed references are rejected", () => {
    expect(() => map([], [event("1", 1, 9)])).toThrow(
        "Invalid memorization range",
    );
    expect(() => map([], [event("1", 3, 1)])).toThrow(
        "Invalid memorization range",
    );
});
test("catalogue creates shared segments for merged and split verses", async () => {
    const getCatalogue = loadTypeScript(
        "src/features/memorization/server/get-memory-catalogue.ts",
        {
            "server-only": {},
            "@/features/quran/server/fetch-quranpedia": {
                createQuranpediaCache: () => async (_key, load) => load(),
            },
            "@/features/quran/server/get-quran-corpus": async () => ({
                surahs: [
                    {
                        ayahs: [1, 2, 3].map((numberInSurah) => ({
                            surah: { number: 1 },
                            numberInSurah,
                            hizbQuarter: 1,
                            page: 1,
                        })),
                    },
                ],
            }),
            "@/features/quran/server/get-warsh-mushaf": {
                getWarshChapters: async () => [
                    {
                        id: 1,
                        verses: [
                            { number: 1, number_in_hafs: [1, 2] },
                            { number: 2, number_in_hafs: [3] },
                            { number: 3, number_in_hafs: [3] },
                        ].map((v) => ({ ...v, hizb: 1, page_number: 1 })),
                    },
                ],
            },
        },
    ).default;
    const c = await getCatalogue();
    expect(c.warsh[0].atoms.length).toBe(2);
    expect(c.hafs[2].atoms.length).toBe(2);
    const ranges = [event("1", 1, 2, { riwayah: "warsh" })];
    expect(
        calculateMemorization(c, "hafs", "hafs", [], ranges)[0].completed,
    ).toBe(2);
    expect(
        calculateMemorization(c, "warsh", "hafs", [], [event("1", 1, 1)])[0]
            .completed,
    ).toBe(0);
});
