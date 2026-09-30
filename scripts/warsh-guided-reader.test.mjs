import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import mapWarshAyahs from "../src/features/quran/helpers/map-warsh-ayahs";

test("Fatiha presentation sentinel is separate from its seven Warsh verses", () => {
    const hafs = Array.from({ length: 7 }, (_, i) => ({
        number: i + 1,
        numberInSurah: i + 1,
        text: "text",
    }));
    const chapter = {
        id: 1,
        verses: [[1, 2], [3], [4], [5], [6], [7], [7]].map((references, i) => ({
            id: 100 + i,
            number: i + 1,
            number_in_hafs: references,
            text: `verse ${i + 1}`,
        })),
    };
    const mapped = mapWarshAyahs(hafs, chapter, true);
    const verses = mapped.filter((ayah) => !ayah.isBasmalaSentinel);
    expect(mapped[0].isBasmalaSentinel).toBe(true);
    expect(verses).toHaveLength(7);
    expect(verses.map((ayah) => ayah.numberInSurah)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(new Set(verses.map((ayah) => ayah.audioNumber)).size).toBe(7);
});

test("both guided readers exclude presentation sentinel before assigning audio", () => {
    for (const path of [
        "src/features/wird/server/get-wird-reader-data.ts",
        "src/features/practice/server/get-practice-reader-data.ts",
    ]) {
        const source = readFileSync(path, "utf8");
        expect(source).toContain("!ayah.isBasmalaSentinel");
        expect(source.indexOf("!ayah.isBasmalaSentinel")).toBeLessThan(
            source.indexOf("const audioAyahNumber"),
        );
        expect(source).not.toContain("showUnnumberedBasmala");
    }
});
