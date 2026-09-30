import { expect, test } from "bun:test";
import {
    availableStarts,
    continuationReferences,
    randomStartPool,
    surahEdgeStarts,
} from "../src/features/memorization/random-start";

test("surah edges require the complete passage to be memorized", () => {
    const surahs = [
        { number: 1, numberOfAyahs: 7 },
        { number: 2, numberOfAyahs: 3 },
    ];
    const pool = [1, 2, 3, 6, 7].map((ayahNumber) => ({
        surahNumber: 1,
        ayahNumber,
    }));
    expect(surahEdgeStarts(pool, surahs, 3, "opening")).toEqual([
        { surahNumber: 1, ayahNumber: 1 },
    ]);
    expect(surahEdgeStarts(pool, surahs, 3, "ending")).toEqual([]);
    expect(surahEdgeStarts(pool, surahs, 2, "ending")).toEqual([
        { surahNumber: 1, ayahNumber: 6 },
    ]);
    const short = [1, 2, 3].map((ayahNumber) => ({
        surahNumber: 2,
        ayahNumber,
    }));
    expect(surahEdgeStarts(short, surahs, 10, "ending")).toEqual([
        { surahNumber: 2, ayahNumber: 1 },
    ]);
    expect(surahEdgeStarts([], surahs, 1, "opening")).toEqual([]);
});

test("prefer full-length starts without repeating any seen reference", () => {
    const surahs = [{ number: 1, numberOfAyahs: 5 }];
    const pool = Array.from({ length: 5 }, (_, index) => ({
        surahNumber: 1,
        ayahNumber: index + 1,
    }));
    expect(availableStarts(pool, [], 2, surahs)).toEqual(pool.slice(0, 3));
    expect(availableStarts(pool, [], 0, surahs)).toEqual(pool);
    expect(availableStarts(pool, [pool[0]], 0, surahs)).toEqual(pool.slice(1));
    expect(availableStarts(pool, [pool[0], pool[2]], 2, surahs)).toEqual([
        pool[1],
    ]);
    expect(availableStarts(pool, pool.slice(0, 3), 2, surahs)).toEqual(
        pool.slice(3),
    );
    expect(availableStarts(pool, pool, 2, surahs)).toEqual([]);
});
test("full-length preference does not cross unmemorized gaps", () => {
    const surahs = [{ number: 1, numberOfAyahs: 10 }];
    const pool = [1, 2, 7, 8, 9, 10].map((ayahNumber) => ({
        surahNumber: 1,
        ayahNumber,
    }));
    expect(availableStarts(pool, [], 3, surahs)).toEqual([pool[2]]);
    expect(availableStarts(pool, [], 30, surahs)).toEqual(pool);
});

test("continuation crosses surahs and returns the requested additional count", () => {
    const surahs = [
        { number: 83, numberOfAyahs: 36 },
        { number: 84, numberOfAyahs: 25 },
    ];
    const pool = [34, 35, 36]
        .map((ayahNumber) => ({ surahNumber: 83, ayahNumber }))
        .concat(
            [1, 2, 3, 4, 5, 6].map((ayahNumber) => ({
                surahNumber: 84,
                ayahNumber,
            })),
        );
    const result = continuationReferences(pool, pool[0], 8, surahs);
    expect(result).toHaveLength(9);
    expect(
        continuationReferences(pool, pool[0], 8, surahs, false),
    ).toHaveLength(3);
    expect(
        continuationReferences(pool, pool[0], 1, surahs, false),
    ).toHaveLength(2);
    expect(result.at(-1)).toEqual({ surahNumber: 84, ayahNumber: 6 });
    expect(
        continuationReferences([pool[0], pool[2]], pool[0], 8, surahs),
    ).toHaveLength(1);
    expect(continuationReferences(pool, pool.at(-1), 8, surahs)).toHaveLength(
        1,
    );
});

const surahs = [
    { number: 1, numberOfAyahs: 4 },
    { number: 2, numberOfAyahs: 5 },
];
const navigation = {
    pages: [],
    juzs: [],
    hizbQuarters: [],
    hizbs: [
        { number: 1, globalAyahNumber: 1, surahNumber: 1, ayahNumber: 1 },
        { number: 2, globalAyahNumber: 4, surahNumber: 1, ayahNumber: 4 },
        { number: 3, globalAyahNumber: 7, surahNumber: 2, ayahNumber: 3 },
    ],
};
test("provider IDs offset from verse counts still select hizbs 59 and 60", () => {
    const offsetNavigation = {
        ...navigation,
        hizbs: navigation.hizbs.map((hizb, index) => ({
            ...hizb,
            number: index + 58,
            globalAyahNumber: hizb.globalAyahNumber + 20000,
        })),
    };
    const pool = randomStartPool(surahs, offsetNavigation, [59, 60]);
    expect(pool).toHaveLength(6);
    expect(pool[0]).toEqual({ surahNumber: 1, ayahNumber: 4, hizb: 59 });
    expect(pool.at(-1)).toEqual({ surahNumber: 2, ayahNumber: 5, hizb: 60 });
});
test("only marked hizbs are eligible, including last hizb", () => {
    const pool = randomStartPool(surahs, navigation, [1, 3]);
    expect(pool.map((p) => p.hizb)).toEqual([1, 1, 1, 3, 3, 3]);
    expect(pool.at(-1)).toEqual({ surahNumber: 2, ayahNumber: 5, hizb: 3 });
});
test("empty memorization never falls back to the whole Quran", () => {
    expect(randomStartPool(surahs, navigation, [])).toEqual([]);
});
test("custom range overrides map and includes both endpoints", () => {
    const pool = randomStartPool(surahs, navigation, [], {
        start: { surahNumber: 1, ayahNumber: 4 },
        end: { surahNumber: 2, ayahNumber: 2 },
    });
    expect(pool).toHaveLength(3);
    expect(pool[0].ayahNumber).toBe(4);
    expect(pool.at(-1).ayahNumber).toBe(2);
});
test("reversed range is empty and single ayah is allowed", () => {
    expect(
        randomStartPool(surahs, navigation, [1], {
            start: { surahNumber: 2, ayahNumber: 1 },
            end: { surahNumber: 1, ayahNumber: 1 },
        }),
    ).toEqual([]);
    const point = { surahNumber: 2, ayahNumber: 5 };
    expect(
        randomStartPool(surahs, navigation, [], { start: point, end: point }),
    ).toHaveLength(1);
});
