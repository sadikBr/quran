import { expect, test } from "bun:test";
import { calculateMemorization } from "../src/features/memorization/progress";
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

test("a whole short surah gives only its own ayahs, not its entire hizb", () => {
    const verses = [111, 112, 113].flatMap((surahNumber) =>
        [1, 2, 3].map((ayahNumber) => ({
            surahNumber,
            ayahNumber,
            hizb: 60,
            quarter: 240,
            page: 604,
            atoms: [`${surahNumber}:${ayahNumber}`],
        })),
    );
    const c = { hafs: verses, warsh: verses };
    const ranges = [{ surahNumber: 112, startAyahNumber: 1, endAyahNumber: 3 }];
    const h = calculateMemorization(c, "hafs", "hafs", [], [], ranges)[59];
    expect(h.completed).toBe(3);
    expect(h.baseline).toBe(3);
    expect(h.percent).toBe(33);
    expect(
        calculateMemorization(c, "hafs", "hafs", [60], [], ranges)[59]
            .completed,
    ).toBe(9);
});

test("partial starting ranges overlap with practice without double credit", () => {
    const ranges = [{ surahNumber: 1, startAyahNumber: 1, endAyahNumber: 1 }];
    expect(
        calculateMemorization(
            catalogue,
            "hafs",
            "hafs",
            [],
            [event("1", 1, 1)],
            ranges,
        )[0].completed,
    ).toBe(1);
    expect(
        calculateMemorization(
            catalogue,
            "hafs",
            "hafs",
            [],
            [event("1", 2, 2)],
            ranges,
        )[0].percent,
    ).toBe(100);
    expect(
        calculateMemorization(
            catalogue,
            "hafs",
            "warsh",
            [],
            [],
            [{ surahNumber: 1, startAyahNumber: 2, endAyahNumber: 2 }],
        )[0].completed,
    ).toBe(0);
    expect(
        calculateMemorization(
            catalogue,
            "hafs",
            "warsh",
            [],
            [],
            [{ surahNumber: 1, startAyahNumber: 2, endAyahNumber: 3 }],
        )[0].completed,
    ).toBe(1);
});

test("starting ranges normalize overlaps and validate against the selected reading", async () => {
    const { normalizeBaselineRanges, validBaselineRanges, memorizedAtoms } =
        await import("../src/features/memorization/progress");
    const ranges = [
        { surahNumber: 1, startAyahNumber: 3, endAyahNumber: 3 },
        { surahNumber: 1, startAyahNumber: 1, endAyahNumber: 2 },
        { surahNumber: 1, startAyahNumber: 2, endAyahNumber: 3 },
    ];
    expect(normalizeBaselineRanges(ranges)).toEqual([
        { surahNumber: 1, startAyahNumber: 1, endAyahNumber: 3 },
    ]);
    expect(ranges[0].startAyahNumber).toBe(3);
    const fourth = [{ surahNumber: 1, startAyahNumber: 4, endAyahNumber: 4 }];
    expect(validBaselineRanges(catalogue.hafs, fourth)).toBe(false);
    expect(validBaselineRanges(catalogue.warsh, fourth)).toBe(true);
    for (const range of [
        { surahNumber: 2, startAyahNumber: 1, endAyahNumber: 1 },
        { surahNumber: 1, startAyahNumber: 3, endAyahNumber: 2 },
        { surahNumber: 1, startAyahNumber: 0, endAyahNumber: 2 },
        { surahNumber: 1, startAyahNumber: 1.5, endAyahNumber: 2 },
    ])
        expect(validBaselineRanges(catalogue.hafs, [range])).toBe(false);
    expect(
        [...memorizedAtoms(catalogue, "hafs", [1], [], ranges)].sort(),
    ).toEqual(["a", "b", "c", "d"]);
});
