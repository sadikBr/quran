import { expect, test } from "bun:test";
import getReadingHref from "../src/features/quran/helpers/get-reading-href";
import {
    normalizeHafsMushaf,
    normalizeQuranpediaTranslation,
    parseQuranpediaMushaf,
    quranpediaPlainText,
} from "../src/features/quran/helpers/quranpedia-data";
import {
    createHafsReference,
    parseQuranpediaSurahs,
} from "../src/features/quran/helpers/quranpedia-surahs";
import { findArabicAyah } from "../src/features/quran/helpers/show-arabic-ayah";
import {
    getQuranpediaEdition,
    QURANPEDIA_EDITIONS,
} from "../src/features/quran/quranpedia-editions";
import { normalizeEditionPreferences } from "../src/features/settings/edition-compatibility";
import { DEFAULT_PREFERENCES } from "../src/features/settings/preferences";
import sample from "./fixtures/quranpedia.json";

const hafsSurahs = parseQuranpediaSurahs(sample.surahs);
const hafsGlobalNumber = createHafsReference(hafsSurahs);

test("surah links and labels use the Quranpedia index", () => {
    expect(hafsSurahs[0].name).toBe(sample.surahs[0].name);
    expect(hafsSurahs[0].englishName).toBe("Al-Fatihah");
    expect(
        getReadingHref(5, DEFAULT_PREFERENCES, hafsSurahs[4].startingPage),
    ).toBe(`/quran/page/${sample.surahs[4].first_page}`);
    expect(() => parseQuranpediaSurahs(sample.surahs.slice(1))).toThrow();
});

test("native Warsh links and translated merged verses resolve without duplicate anchors", () => {
    const verses = [
        { id: "ayah-68500", hafs: [24, 25] },
        { id: "ayah-68501", hafs: [26] },
        { id: "ayah-68502", hafs: [26] },
    ];
    const root = {
        getElementById: (id) => verses.find((verse) => verse.id === id) ?? null,
        querySelector: (selector) => {
            const number = Number(selector.match(/~="(\d+)"/)?.[1]);
            return verses.find((verse) => verse.hafs.includes(number)) ?? null;
        },
    };
    expect(findArabicAyah(25, root)).toBe(verses[0]);
    expect(findArabicAyah(26, root)).toBe(verses[1]);
    expect(findArabicAyah(68502, root)).toBe(verses[2]);
    expect(findArabicAyah(99, root)).toBeNull();
});

function fullMushaf() {
    return {
        ...sample.hafs,
        id: 2,
        surahs: hafsSurahs.map((surah) => ({
            id: surah.number,
            name: surah.name,
            coded_name: "",
            ayahs: Array.from({ length: surah.numberOfAyahs }, (_, i) => ({
                ...sample.hafs.surahs[0].ayahs[0],
                id: hafsGlobalNumber(surah.number, i + 1) + 62250,
                surah: String(surah.number),
                number: i + 1,
                number_in_hafs: [i + 1],
                page_number: Math.ceil(
                    (hafsGlobalNumber(surah.number, i + 1) * 604) / 6236,
                ),
                text:
                    surah.number === 7 && i === 205
                        ? sample.sajdaVerse.text
                        : sample.hafs.surahs[0].ayahs[0].text,
                ...(surah.number === 5 && i === 76
                    ? { page_number: sample.hafsPageBoundaryVerse.page_number }
                    : {}),
            })),
        })),
    };
}

test("Hafs scripts use Quranpedia references, page assignments and text sajda markers", () => {
    const mushaf = parseQuranpediaMushaf(fullMushaf(), 2, hafsSurahs);
    const corpus = normalizeHafsMushaf(
        mushaf,
        getQuranpediaEdition("quranpedia.mushaf.2"),
        hafsSurahs,
    );
    expect(corpus.surahs).toHaveLength(114);
    expect(corpus.surahs.flatMap((s) => s.ayahs)).toHaveLength(6236);
    expect(corpus.surahs[1].ayahs[254].number).toBe(262);
    expect(corpus.surahs[113].ayahs[5].number).toBe(6236);
    expect(corpus.surahs[0].ayahs[0].text).not.toContain("\uFEFF");
    expect(corpus.surahs[6].ayahs[205].sajda).toBe(true);
    expect(corpus.surahs[0].ayahs[0].sajda).toBe(false);
    expect(corpus.surahs[4].ayahs[76].page).toBe(
        sample.hafsPageBoundaryVerse.page_number,
    );
    expect(corpus.surahs[113].ayahs[5].page).toBe(604);
    expect(
        new Set(corpus.surahs.flatMap((s) => s.ayahs.map((a) => a.page))).size,
    ).toBe(604);
});

test("mushaf validation rejects truncation, duplicate references and wrong editions", () => {
    expect(() => parseQuranpediaMushaf(sample.hafs, 1, hafsSurahs)).toThrow();
    const data = fullMushaf();
    expect(() => parseQuranpediaMushaf(data, 1, hafsSurahs)).toThrow();
    data.surahs[1].ayahs[0].number = 2;
    expect(() => parseQuranpediaMushaf(data, 2, hafsSurahs)).toThrow();
    expect(() => hafsGlobalNumber(2, 287)).toThrow();
});

test("translations join by canonical verse reference and retain notes as inert text", () => {
    const hafs = normalizeHafsMushaf(
        parseQuranpediaMushaf(fullMushaf(), 2, hafsSurahs),
        getQuranpediaEdition("quranpedia.mushaf.2"),
        hafsSurahs,
    );
    const data = {
        id: 13638,
        ayahs: hafs.surahs
            .flatMap((s) =>
                s.ayahs.map((a) => ({
                    surah_number: s.number,
                    ayah_number: a.numberInSurah,
                    translated_text: `<div>Verse ${a.number}</div><p>Note &amp; detail.</p>`,
                })),
            )
            .reverse(),
    };
    const corpus = normalizeQuranpediaTranslation(
        data,
        13638,
        hafs,
        getQuranpediaEdition("quranpedia.translation.13638"),
    );
    expect(corpus.surahs[1].ayahs[254].text).toBe("Verse 262\nNote & detail.");
    expect(corpus.surahs[1].ayahs[254].page).toBe(
        hafs.surahs[1].ayahs[254].page,
    );
    data.ayahs[0] = data.ayahs[1];
    expect(() =>
        normalizeQuranpediaTranslation(
            data,
            13638,
            hafs,
            getQuranpediaEdition("quranpedia.translation.13638"),
        ),
    ).toThrow();
    expect(
        quranpediaPlainText(
            "<script>alert(1)</script><p>A<br>B &#x627; &quot;C&quot;</p>",
        ),
    ).toBe('A\nB ا "C"');
});

test("invalid catalogue choices use Quranpedia defaults", () => {
    const saved = {
        ...DEFAULT_PREFERENCES,
        arabicEdition: "missing-text",
        translationEdition: "missing-translation",
        tafsirEdition: "missing-commentary",
        riwayah: "warsh",
        arabicTextSize: 5,
        readingMode: "surah",
    };
    const result = normalizeEditionPreferences(saved, QURANPEDIA_EDITIONS, [
        {
            id: "quranpedia/263",
            host: "quranpedia",
            scope: "ayah",
            recitation: "warsh",
            name: "Warsh",
        },
    ]);
    expect(result.arabicEdition).toBe("quranpedia.mushaf.1");
    expect(result.translationEdition).toBe("quranpedia.translation.13638");
    expect(result.tafsirEdition).toBe("quranpedia.tafsir.2012");
    expect(result.riwayah).toBe("warsh");
    expect(result.readingMode).toBe("surah");
    expect(result.arabicTextSize).toBe(5);
    expect(() => getQuranpediaEdition("../../invalid")).toThrow();
});
