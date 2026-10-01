import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import mapWarshAyahs from "../src/features/quran/helpers/map-warsh-ayahs";
import { TAJWEED_RULES } from "../src/features/quran/helpers/quranpedia-tajweed";
import { getWarshTajweed } from "../src/features/quran/server/warsh-tajweed";
import {
    DEFAULT_PREFERENCES,
    preferencesZodSchema,
} from "../src/features/settings/preferences";

const read = (path) =>
    JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const fixtures = read("./fixtures/warsh-tajweed.json");
const data = read("../src/features/quran/data/warsh-tajweed/annotations.json");
const report = read("../src/features/quran/data/warsh-tajweed/report.json");

test("Warsh annotations preserve Quranpedia text and never fall back to Hafs rules", () => {
    for (const { surah, ayah, text } of fixtures.filter(
        (v) => v.surah !== 67,
    )) {
        const segments = getWarshTajweed(surah, ayah, text);
        expect(segments).toBeDefined();
        expect(segments.map((s) => s.text).join("")).toBe(text);
        for (const segment of segments) {
            if (segment.rule)
                expect(segment.rule.startsWith("warsh-")).toBe(true);
        }
        expect(getWarshTajweed(surah, ayah, `${text}ا`)).toBeUndefined();
    }
    const verse = fixtures.find((v) => v.surah === 67);
    expect(getWarshTajweed(67, 10, verse.text)).toBeUndefined();
    expect(getWarshTajweed(999, 1, "")).toBeUndefined();
});

test("Generated coverage has known, ordered spans and explicit omissions", () => {
    expect(Object.keys(data).length).toBe(114);
    let count = 0;
    for (const [surah, verses] of Object.entries(data)) {
        for (const [ayah, { hash, spans }] of Object.entries(verses)) {
            count++;
            expect(report.excluded[`${surah}:${ayah}`]).toBeUndefined();
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
            let end = 0;
            for (const [start, stop, rules] of spans) {
                expect(start >= end && stop > start).toBe(true);
                expect(rules.length).toBeGreaterThan(0);
                expect(
                    rules.every(
                        (r) =>
                            r.startsWith("warsh-") &&
                            Object.hasOwn(TAJWEED_RULES, r),
                    ),
                ).toBe(true);
                end = stop;
            }
        }
    }
    expect(count).toBe(report.included);
    expect(count).toBeGreaterThanOrEqual(6213);
    expect(count + Object.keys(report.excluded).length).toBe(6214);
});

test("Warsh mapping replaces Hafs annotations and leaves the basmala sentinel plain", () => {
    const text = fixtures[0].text;
    const tajweed = getWarshTajweed(1, 1, text);
    const hafs = [1, 2].map((numberInSurah) => ({
        number: numberInSurah,
        numberInSurah,
        text: "hafs",
        tajweed: [{ text: "hafs", rule: "ghunnah" }],
        tajweedUnavailable: true,
    }));
    const mapped = mapWarshAyahs(hafs, {
        id: 1,
        verses: [
            {
                id: 68487,
                number: 1,
                number_in_hafs: [1, 2],
                text,
                tajweed,
                tajweedUnavailable: false,
            },
        ],
    });
    expect(mapped[0].isBasmalaSentinel).toBe(true);
    expect(mapped[0].tajweed).toBeUndefined();
    expect(mapped[1].tajweed).toBe(tajweed);
    expect(mapped[1].tajweedUnavailable).toBe(false);
    expect(mapped[1].hafsGlobalNumber).toBe(2);
});

test("Warsh colouring is independently reversible without changing the Hafs choice", () => {
    for (const warshTajweed of [true, false]) {
        const prefs = preferencesZodSchema.parse({
            ...DEFAULT_PREFERENCES,
            riwayah: "warsh",
            warshTajweed,
            arabicEdition: "quranpedia.mushaf.2",
        });
        expect(prefs.warshTajweed).toBe(warshTajweed);
        expect(prefs.arabicEdition).toBe("quranpedia.mushaf.2");
    }
    const oldPreferences = { ...DEFAULT_PREFERENCES };
    delete oldPreferences.warshTajweed;
    expect(preferencesZodSchema.parse(oldPreferences).warshTajweed).toBe(false);
});
