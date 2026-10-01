import { expect, test } from "bun:test";
import getRecitationStreams from "../src/features/quran/helpers/get-recitation-streams";
import { usesNativeWarshAyahNumbering } from "../src/features/quran/helpers/map-warsh-ayahs";
import { parseQuranpediaReciters } from "../src/features/quran/helpers/quranpedia-reciters";

const entry = (id, rawi, classification = 2) => ({
    id,
    name: `Reciter ${id}`,
    rawi: { name: rawi },
    classification: { id: classification },
    server: `https://files.quranpedia.net/recitations/${id}/`,
    surahs_list: Array.from({ length: 114 }, (_, i) => i + 1),
});
const catalog = [[entry(263, "ورش")], [entry(255, "حفص")]];

test("one catalog serves Hafs and native Warsh ayah URLs", () => {
    const [warsh, hafs] = parseQuranpediaReciters(catalog);
    expect(usesNativeWarshAyahNumbering(warsh)).toBe(true);
    expect(usesNativeWarshAyahNumbering(hafs)).toBe(false);
    for (const [surahNumber, ayahNumber, file] of [
        [1, 1, "001001"],
        [1, 7, "001007"],
        [2, 1, "002001"],
        [2, 2, "002002"],
    ]) {
        expect(
            getRecitationStreams(warsh, {
                surahNumber,
                ayahNumber,
                globalAyahNumber: 999,
            }),
        ).toEqual([`https://files.quranpedia.net/recitations/263/${file}.mp3`]);
    }
    expect(
        getRecitationStreams(hafs, { surahNumber: 2, ayahNumber: 255 }),
    ).toEqual(["https://files.quranpedia.net/recitations/255/002255.mp3"]);
    expect(
        getRecitationStreams(warsh, { surahNumber: 1, ayahNumber: 0 }),
    ).toEqual([]);
});
test("retains partial recordings but blocks unavailable surah URLs", () => {
    expect(() => parseQuranpediaReciters({})).toThrow();
    expect(() => parseQuranpediaReciters([])).toThrow();
    const partial = { ...entry(900, "حفص"), surahs_list: [1] };
    expect(
        parseQuranpediaReciters([...catalog, [entry(901, "قالون"), partial]]),
    ).toHaveLength(3);
    const reciter = parseQuranpediaReciters([...catalog, [partial]]).find(
        (r) => r.id === "quranpedia/900",
    );
    expect(
        getRecitationStreams(reciter, { surahNumber: 2, ayahNumber: 1 }),
    ).toEqual([]);
    expect(
        getRecitationStreams(reciter, { surahNumber: 1, ayahNumber: 1 }),
    ).toHaveLength(1);
    const whole = parseQuranpediaReciters([
        ...catalog,
        [{ ...partial, classification: { id: 1 } }],
    ]).find((r) => r.id === "quranpedia/900");
    expect(getRecitationStreams(whole, { surahNumber: 2 })).toEqual([]);
    expect(getRecitationStreams(whole, { surahNumber: 1 })).toEqual([
        "https://files.quranpedia.net/recitations/900/001.mp3",
    ]);
});
