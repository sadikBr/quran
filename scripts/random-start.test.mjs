import { expect, test } from "bun:test";
import {
    continuationReferences,
    randomStartPool,
} from "../src/features/memorization/random-start";

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
