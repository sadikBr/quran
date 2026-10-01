// Run with Bun. This opt-in check reads only public Quranpedia endpoints.
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import {
    normalizeHafsMushaf,
    normalizeQuranpediaTranslation,
    parseQuranpediaMushaf,
    quranpediaPlainText,
} from "../src/features/quran/helpers/quranpedia-data";
import { parseQuranpediaSurahs } from "../src/features/quran/helpers/quranpedia-surahs";
import {
    getQuranpediaEdition,
    TAFSIR_EDITIONS,
    TRANSLATION_EDITIONS,
} from "../src/features/quran/quranpedia-editions";

async function read(path) {
    const response = await fetch(`https://api.quranpedia.net${path}`, {
        signal: AbortSignal.timeout(30000),
    });
    assert(response.ok, `${path}: HTTP ${response.status}`);
    return path.endsWith(".gz")
        ? JSON.parse(
              gunzipSync(Buffer.from(await response.arrayBuffer())).toString(),
          )
        : response.json();
}

const surahs = parseQuranpediaSurahs(await read("/v1/surahs"));
const mushafs = await Promise.all(
    [1, 2, 4].map(async (id) => {
        const dump = await read(`/dumps/mushafs-${id}.json.gz`);
        const mushaf = parseQuranpediaMushaf(dump.data, id, surahs);
        console.log(
            `Mushaf ${id}: ${mushaf.surahs.reduce((sum, s) => sum + s.ayahs.length, 0)} verses; source version ${dump.license.version}`,
        );
        return mushaf;
    }),
);
const hafs = normalizeHafsMushaf(
    mushafs[0],
    getQuranpediaEdition("quranpedia.mushaf.1"),
    surahs,
);
const verses = hafs.surahs.flatMap((s) => s.ayahs);
assert.deepEqual(
    verses.map((a) => [a.number, a.page, a.sajda]),
    mushafs[0].surahs.flatMap((s) =>
        s.ayahs.map((a) => [a.id, a.page_number, a.text.includes("۩")]),
    ),
);
assert.equal(new Set(verses.map((a) => a.page)).size, 604);
assert.equal(new Set(verses.map((a) => a.juz)).size, 30);
assert.equal(new Set(verses.map((a) => a.hizbQuarter)).size, 240);
assert.equal(verses.filter((a) => a.sajda).length, 15);
const uthmani = normalizeHafsMushaf(
    mushafs[1],
    getQuranpediaEdition("quranpedia.mushaf.2"),
    surahs,
);
assert.deepEqual(
    uthmani.surahs.flatMap((s) => s.ayahs.map((a) => [a.number, a.page])),
    verses.map((a) => [a.number, a.page]),
);

// Keep concurrency small to respect upstream request limits.
for (const [identifier, id] of Object.entries(TRANSLATION_EDITIONS)) {
    const corpus = normalizeQuranpediaTranslation(
        await read(`/translation-books/${id}.json`),
        id,
        hafs,
        getQuranpediaEdition(identifier),
    );
    assert.equal(corpus.surahs.flatMap((s) => s.ayahs).length, 6236);
    console.log(`Translation ${identifier}: 6,236 mapped verses`);
}
for (const [identifier, id] of Object.entries(TAFSIR_EDITIONS)) {
    const value = await read(`/v1/ayah/2/255/book/${id}`);
    assert.equal(value.book.id, id);
    assert(
        value.content.some(
            (entry) => quranpediaPlainText(entry.text).length > 0,
        ),
        `${identifier}: missing Ayat al-Kursi commentary`,
    );
    console.log(`Tafsir ${identifier}: verified book and commentary`);
}
console.log("Quranpedia live validation passed.");
