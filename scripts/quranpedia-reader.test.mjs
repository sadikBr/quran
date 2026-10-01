import { afterAll, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import {
    createHafsReference,
    parseQuranpediaSurahs,
} from "../src/features/quran/helpers/quranpedia-surahs";
import sample from "./fixtures/quranpedia.json";

mock.module("server-only", () => ({}));
mock.module("../src/features/settings/server/get-preferences", () => ({
    default: async () => ({ tafsirEdition: "quranpedia.tafsir.2012" }),
}));

const originalFetch = globalThis.fetch;
const requests = [];
const hafsSurahs = parseQuranpediaSurahs(sample.surahs);
const hafsGlobalNumber = createHafsReference(hafsSurahs);
const surahs = hafsSurahs.map((surah) => ({
    id: surah.number,
    name: surah.name,
    coded_name: "",
    ayahs: Array.from({ length: surah.numberOfAyahs }, (_, index) => {
        const number = hafsGlobalNumber(surah.number, index + 1);
        return {
            ...sample.hafs.surahs[0].ayahs[0],
            id: number,
            number: index + 1,
            surah: String(surah.number),
            page_number: Math.ceil((number * 604) / 6236),
            text: number === 262 ? "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ" : "بِسْمِ اللَّهِ",
            juz: Math.ceil(Math.ceil((number * 240) / 6236) / 8),
            hizb: Math.ceil((number * 240) / 6236),
            number_in_hafs: [index + 1],
        };
    }),
}));
globalThis.fetch = async (input) => {
    const url = new URL(input);
    expect(url.origin).toBe("https://api.quranpedia.net");
    requests.push(url.pathname);
    if (url.pathname === "/v1/surahs") return Response.json(sample.surahs);
    const id = Number(url.pathname.match(/mushafs-(\d+)/)?.[1]);
    if (id) {
        const chapters = structuredClone(surahs);
        if (id === 4) {
            let nextId = 70000;
            for (const [index, chapter] of chapters.entries()) {
                const original = chapter.ayahs;
                chapter.ayahs = Array.from(
                    { length: sample.warshVerseCounts[index] },
                    (_, i) => ({
                        ...original[Math.min(i, original.length - 1)],
                        id: nextId++,
                        number: i + 1,
                    }),
                );
            }
            chapters[0] = sample.warshFatiha;
            chapters[1].ayahs[0].number_in_hafs = [1, 2];
            chapters[1].ayahs[1].number_in_hafs = [3, 4];
        } else if (id === 2)
            for (const s of chapters) for (const a of s.ayahs) a.id += 62250;
        return new Response(
            gzipSync(
                JSON.stringify({
                    license: { version: sample.version },
                    data: { ...sample.hafs, id, surahs: chapters },
                }),
            ),
        );
    }
    if (url.pathname === "/translation-books/13638.json")
        return Response.json({
            id: 13638,
            ayahs: surahs.flatMap((s) =>
                s.ayahs.map((a) => ({
                    surah_number: s.id,
                    ayah_number: a.number,
                    translated_text:
                        a.id === 262
                            ? "<div>Allah — the Ever-Living.</div>"
                            : "<div>In the name of Allah.</div>",
                })),
            ),
        });
    if (url.pathname === "/v1/ayah/1/1/book/2012")
        return Response.json(sample.tafsir);
    if (url.pathname === "/v1/ayah/1/1/book/272")
        return Response.json({ book: { id: 272 }, content: [] });
    const tafsirRequest = url.pathname.match(
        /^\/v1\/ayah\/(\d+)\/(\d+)\/book\/(2012|272)$/,
    );
    if (tafsirRequest) {
        const [, surah, ayah, book] = tafsirRequest;
        const text =
            surah === "2" && Number(ayah) >= 3
                ? "Shared passage"
                : `Commentary ${book} for ${surah}:${ayah}`;
        return Response.json({
            book: { id: Number(book) },
            content: [{ text }],
        });
    }
    throw new Error(`Unexpected upstream request: ${url.pathname}`);
};
afterAll(() => {
    globalThis.fetch = originalFetch;
});

const { default: getSurah } = await import(
    "../src/features/quran/server/get-surah"
);
const { default: getPage } = await import(
    "../src/features/quran/server/get-quran-page-data"
);
const { default: getNavigation } = await import(
    "../src/features/quran/server/get-quran-navigation-meta"
);
const { default: search } = await import(
    "../src/features/quran/server/search-quran"
);
const { default: getAyah } = await import(
    "../src/features/quran/server/get-ayah"
);
const { default: getReaderTafsir } = await import(
    "../src/features/quran/server/get-reader-tafsir"
);
const { GET: offline } = await import(
    "../src/app/api/offline/quran/[dataset]/route"
);
const { createQuranpediaCache } = await import(
    "../src/features/quran/server/fetch-quranpedia"
);

test("page, surah, translation and Uthmani readers share stable references", async () => {
    const [surah, page, translated, uthmani] = await Promise.all([
        getSurah("2"),
        getPage(42),
        getPage(42, "quranpedia.translation.13638"),
        getSurah("2", "quranpedia.mushaf.2"),
    ]);
    expect(surah.ayahs[254].number).toBe(262);
    expect(uthmani.ayahs[254].number).toBe(262);
    expect(surah.ayahs[254].surah.number).toBe(2);
    expect(translated.ayahs.map((a) => a.number)).toEqual(
        page.ayahs.map((a) => a.number),
    );
    expect(
        requests.filter((p) => p === "/dumps/mushafs-1.json.gz"),
    ).toHaveLength(1);
});

test("navigation retains every page and division", async () => {
    const navigation = await getNavigation();
    expect(navigation.pages).toHaveLength(604);
    expect(navigation.juzs).toHaveLength(30);
    expect(navigation.hizbs).toHaveLength(60);
    expect(navigation.hizbQuarters).toHaveLength(240);
    expect(navigation.pages.at(-1).pageNumber).toBe(604);
});

test("Arabic and English verse search and Warsh alignment still work", async () => {
    const args = {
        arabicEdition: "quranpedia.mushaf.1",
        translationEdition: "quranpedia.translation.13638",
        riwayah: "hafs",
    };
    const arabic = await search({ ...args, query: "الله لا اله" });
    expect(arabic.results[0].globalAyahNumber).toBe(262);
    const english = await search({ ...args, query: "Ever-Living" });
    expect(english.results[0].ayahNumber).toBe(255);
    expect(english.results[0].arabicText).toContain("اللَّهُ");
    const warsh = await search({ ...args, query: "الحمد", riwayah: "warsh" });
    expect(warsh.results[0].ayahNumber).toBe(1);
    expect(warsh.results[0].globalAyahNumber).toBe(
        sample.warshFatiha.ayahs[0].id,
    );
    expect(warsh.results[0].pageNumber).toBe(1);
});

test("tafsir returns inert commentary and absent commentary does not break ayah actions", async () => {
    const ayah = await getAyah(1, "quranpedia.tafsir.2012");
    expect(ayah.text).toContain("أبتدئ");
    expect(ayah.edition.identifier).toBe("quranpedia.tafsir.2012");
    expect((await getAyah(1, "quranpedia.tafsir.272")).text).toBe("");
    expect((await getAyah(262, "quranpedia.translation.13638")).text).toBe(
        "Allah — the Ever-Living.",
    );
    await expect(
        getAyah(6237, "quranpedia.translation.13638"),
    ).rejects.toThrow();
});

test("Warsh tafsir covers every mapped verse when opening and switching books", async () => {
    for (const book of [2012, 272]) {
        const result = await getReaderTafsir(
            2,
            1,
            "warsh",
            `quranpedia.tafsir.${book}`,
        );
        expect(result.text).toBe(
            `Commentary ${book} for 2:1\n\nCommentary ${book} for 2:2`,
        );
        expect(result.edition.identifier).toBe(`quranpedia.tafsir.${book}`);
    }
    expect(
        (await getReaderTafsir(2, 1, "hafs", "quranpedia.tafsir.2012")).text,
    ).toBe("Commentary 2012 for 2:1");
    expect(
        (await getReaderTafsir(2, 2, "warsh", "quranpedia.tafsir.2012")).text,
    ).toBe("Shared passage");
});

test("Warsh Fatiha commentary follows its displayed text and split final verse", async () => {
    expect(
        (await getReaderTafsir(1, 1, "warsh", "quranpedia.tafsir.2012")).text,
    ).toBe("Commentary 2012 for 1:2");
    for (const verse of [6, 7]) {
        expect(
            (await getReaderTafsir(1, verse, "warsh", "quranpedia.tafsir.2012"))
                .text,
        ).toBe("Commentary 2012 for 1:7");
    }
    expect(
        (await getReaderTafsir(1, 1, "hafs", "quranpedia.tafsir.272")).text,
    ).toBe("");
});

test("reader tafsir rejects invalid references and non-tafsir editions", async () => {
    for (const args of [
        [2, 0, "warsh", "quranpedia.tafsir.2012"],
        [1, 8, "warsh", "quranpedia.tafsir.2012"],
        [1, 8, "hafs", "quranpedia.tafsir.2012"],
        [115, 1, "hafs", "quranpedia.tafsir.2012"],
        [1, 1, "unknown", "quranpedia.tafsir.2012"],
        [1, 1, "warsh", "quranpedia.mushaf.1"],
    ])
        await expect(getReaderTafsir(...args)).rejects.toThrow();
});

test("offline exports preserve all datasets and share the service-worker version", async () => {
    for (const dataset of ["hafs", "warsh", "translation"]) {
        const response = await offline(new Request("http://localhost"), {
            params: Promise.resolve({ dataset }),
        });
        const data = await response.json();
        expect(data.kind).toBe(dataset);
        expect(data.surahs).toHaveLength(114);
        expect(readFileSync("public/sw.js", "utf8")).toContain(
            `OFFLINE_VERSION = "${data.version}"`,
        );
        expect(data.surahs[0].ayahs[0].page).toBe(1);
        if (dataset !== "warsh")
            expect(data.surahs.flatMap((s) => s.ayahs)).toHaveLength(6236);
    }
    const invalid = await offline(new Request("http://localhost"), {
        params: Promise.resolve({ dataset: "invalid" }),
    });
    expect(invalid.status).toBe(404);
});

test("cache coalesces requests and retries failed loads", async () => {
    const cached = createQuranpediaCache(2);
    let count = 0;
    const load = async () => {
        count++;
        return "verified";
    };
    expect(await Promise.all([cached("a", load), cached("a", load)])).toEqual([
        "verified",
        "verified",
    ]);
    expect(count).toBe(1);
    await expect(
        cached("b", async () => {
            throw new Error("offline");
        }),
    ).rejects.toThrow("offline");
    expect(await cached("b", load)).toBe("verified");
});
