import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
    parseTajweedChapter,
    parseTajweedVerse,
} from "../src/features/quran/helpers/quranpedia-tajweed";
import { getQuranpediaEdition } from "../src/features/quran/quranpedia-editions";

const html = readFileSync(
    new URL("./fixtures/quranpedia-tajweed.html", import.meta.url),
    "utf8",
);
const texts = [
    ...html.matchAll(/<a\s+class="ayah"[^>]*>([\s\S]*?)<span class="marker">/g),
].map((m) => m[1].replace(/<[^>]+>/g, "").trim());

test("Quranpedia Tajweed preserves all verse text and known rule annotations", () => {
    const verses = parseTajweedChapter(html, 1, texts);
    expect(verses.size).toBe(7);
    expect(verses.get(7).some((s) => s.rule === "madda-necessary")).toBe(true);
    for (let n = 1; n <= 7; n++)
        expect(
            verses
                .get(n)
                .map((s) => s.text)
                .join(""),
        ).toBe(texts[n - 1]);
    expect(getQuranpediaEdition("quranpedia.mushaf.11").type).toBe("quran");
});
test("Tajweed rejects changed, missing, duplicate or misidentified verses", () => {
    expect(() => parseTajweedChapter(html, 2, texts)).toThrow();
    expect(() => parseTajweedChapter(html + html, 1, texts)).toThrow();
    expect(() => parseTajweedChapter(html, 1, [...texts, "missing"])).toThrow();
    expect(() =>
        parseTajweedChapter(html, 1, ["different", ...texts.slice(1)]),
    ).toThrow();
});
test("Tajweed rejects executable HTML, unknown rules and malformed annotation", () => {
    for (const input of [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        '<tajweed class="x" data-type="unknown">ن</tajweed>',
        '<tajweed class="x" data-type="ghunnah" onclick="alert(1)">ن</tajweed>',
        '<tajweed class="x" data-type="ghunnah">ن',
        "&lt;script&gt;",
    ])
        expect(() => parseTajweedVerse(input)).toThrow();
});
