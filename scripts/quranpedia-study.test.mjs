import { afterAll, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
    mergeStudyPassages,
    parseSimilarReferences,
    parseStudyBooks,
    parseStudyMeanings,
    parseStudyNotes,
    validateStudyFragment,
} from "../src/features/quran/helpers/quranpedia-study";
import fixture from "./fixtures/quranpedia-study.json";

test("grammar sections with numeric identifiers expose verified source books", () => {
    expect(
        parseStudyBooks(fixture.e3rab, 1, 2, "e3rab").map((book) => book.id),
    ).toEqual([318, 309, 316, 180]);
    expect(() => parseStudyBooks(fixture.e3rab, 1, 3, "e3rab")).toThrow();
});

test("published reflections preserve text, category, attribution and attached media", () => {
    const notes = parseStudyNotes(fixture.notes, 2, 255);
    expect(notes[0].text).toContain("نمْ أنت");
    expect(notes[0].text).not.toContain("blockquote");
    expect(notes[0].category).toBe("وقفات مع سور وآيات");
    expect(notes[0].attribution).toBe("عبدالله بلقاسم");
    expect(notes[0].references).toEqual([255]);
    expect(notes.at(-1).hasAttachments).toBe(true);
    const nested = fixture.notes.replace(
        "نمْ أنت",
        '<div title="a > b">نمْ أنت<script>attack()</script></div>',
    );
    expect(parseStudyNotes(nested, 2, 255)[0].text).not.toMatch(
        /attack|title=/,
    );
    expect(() => parseStudyNotes(fixture.notes, 2, 256)).toThrow();
    expect(() =>
        parseStudyNotes(
            fixture.notes.replaceAll('class="prose ', 'class="changed '),
            2,
            255,
        ),
    ).toThrow();
    expect(
        parseStudyNotes(fixture["notes-fatiha"], 1, 2).length,
    ).toBeGreaterThan(0);
});

test("live fragments expose source books, definitions, and grouped verse references", () => {
    expect(
        parseStudyBooks(fixture.meanings, 2, 255, "meanings").map(
            (book) => book.id,
        ),
    ).toEqual([491, 327, 208, 1424]);
    const meanings = parseStudyMeanings(fixture.meanings, 2, 255, 491);
    expect(meanings).toHaveLength(4);
    expect(meanings[0]).toEqual({
        word: "الْقَيُّومُ",
        meaning: "القَائِمُ عَلَى كُلِّ شَيءٍ.",
        references: [255],
    });
    expect(
        parseStudyBooks(fixture.tafsir, 2, 255, "tafsir").find(
            (book) => book.id === 4,
        )?.name,
    ).toBe("جامع البيان في تأويل آي القرآن");
    expect(
        parseStudyBooks(fixture.asbab, 2, 115, "asbab").map((book) => book.id),
    ).toEqual([2919, 460]);
    const groups = parseSimilarReferences(fixture.similar, 2, 255);
    expect(groups.map((group) => group.type)).toEqual([
        "beginning",
        "ending",
        "phrases",
    ]);
    expect(groups[0].references[0]).toEqual({ surah: 3, ayah: 2 });
});

test("changed identities, source books and fragment structures fail closed", () => {
    expect(() =>
        validateStudyFragment(fixture.meanings, 2, 256, "meanings"),
    ).toThrow();
    expect(() =>
        validateStudyFragment(fixture.meanings, 3, 255, "meanings"),
    ).toThrow();
    expect(() =>
        validateStudyFragment(fixture.meanings, 2, 255, "tafsir"),
    ).toThrow();
    expect(() => parseStudyMeanings(fixture.meanings, 2, 255, 327)).toThrow();
    expect(() =>
        parseStudyMeanings(
            fixture.meanings.replaceAll("tbody", "changed"),
            2,
            255,
            491,
        ),
    ).toThrow();
    expect(() =>
        parseSimilarReferences(
            fixture.similar.replaceAll("data-embed-tab-panel", "changed"),
            2,
            255,
        ),
    ).toThrow();
});

test("single-book revelation context is discovered from its source footer", () => {
    expect(parseStudyBooks(fixture.singleBookAsbab, 1, 2, "asbab")).toEqual([
        { id: 2919, name: "أسباب نزول القرآن - الواحدي", author: undefined },
    ]);
    expect(() =>
        parseStudyBooks(fixture.singleBookAsbab, 1, 1, "asbab"),
    ).toThrow();
    expect(() =>
        parseStudyBooks(
            fixture.singleBookAsbab.replaceAll(
                "https://api.quranpedia.net/book/",
                "https://example.org/book/",
            ),
            1,
            2,
            "asbab",
        ),
    ).toThrow();
    expect(() =>
        parseStudyBooks(
            fixture.singleBookAsbab
                .replaceAll("<h3", "<h4")
                .replaceAll("</h3>", "</h4>"),
            1,
            2,
            "asbab",
        ),
    ).toThrow();
});

test("upstream executable markup is discarded and unrelated links cannot supply references", () => {
    const injection =
        '<script><a href="https://api.quranpedia.net/surah/1/114#6">Injected</a></script>';
    const html = fixture.similar.replace(
        "</section>",
        `${injection}<a href="https://example.org/surah/1/114#6">Wrong origin</a><a href="javascript:alert(1)">Unsafe</a></section>`,
    );
    expect(parseSimilarReferences(html, 2, 255)).toEqual(
        parseSimilarReferences(fixture.similar, 2, 255),
    );
    const definitions = fixture.meanings.replace(
        "نُعَاسٌ.",
        'نُعَاسٌ.<script>attack()</script><img src=x onerror="attack()">',
    );
    expect(parseStudyMeanings(definitions, 2, 255, 491)[1].meaning).toBe(
        "نُعَاسٌ.",
    );
});

test("duplicate mapped commentary keeps every verse reference", () => {
    expect(
        mergeStudyPassages([
            { text: "Shared passage", references: [3], page: 2 },
            { text: "Shared passage", references: [4], page: 2 },
            { text: "Another passage", references: [4], page: 3 },
        ]),
    ).toEqual([
        { text: "Shared passage", references: [3, 4], page: 2 },
        { text: "Another passage", references: [4], page: 3 },
    ]);
});

// Isolate module mocks so this suite cannot replace real readers in other tests.
if (!process.env.QURAN_STUDY_TEST_WORKER) {
    test("study server scenarios pass in an isolated runtime", () => {
        const result = spawnSync(process.execPath, ["test", import.meta.path], {
            env: { ...process.env, QURAN_STUDY_TEST_WORKER: "1" },
            encoding: "utf8",
            timeout: 30000,
        });
        if (result.status !== 0)
            throw new Error(
                result.stderr ||
                    result.error?.message ||
                    "Study scenarios failed",
            );
        expect(result.status).toBe(0);
    });
} else {
    mock.module("server-only", () => ({}));
    const requests = [];
    const originalFetch = globalThis.fetch;
    const options = [
        "tafsir",
        "meanings",
        "asbab",
        "translations",
        "similar",
        "topics",
        "e3rab",
        "notes",
    ];
    const corpus = {
        surahs: Array.from({ length: 114 }, (_, index) => ({
            ayahs: Array.from({ length: 286 }, (_, verse) => ({
                number: index * 300 + verse + 1,
                numberInSurah: verse + 1,
                studyOptions: options,
                text: `Verse ${index + 1}:${verse + 1}`,
                surah: {
                    name: `سورة ${index + 1}`,
                    englishName: `Surah ${index + 1}`,
                },
            })),
        })),
    };
    mock.module("../src/features/quran/server/get-quran-corpus", () => ({
        default: async () => corpus,
    }));
    mock.module("../src/features/quran/server/get-surah", () => ({
        default: async (surah) => ({
            ayahs: corpus.surahs[Number(surah) - 1].ayahs,
        }),
    }));
    mock.module("../src/features/quran/server/get-warsh-chapter", () => ({
        default: async (surah) => ({
            verses: [
                {
                    number: 1,
                    number_in_hafs: surah === 1 ? [1, 2] : [255, 256],
                },
                { number: 6, number_in_hafs: [7] },
                { number: 7, number_in_hafs: [7] },
            ],
        }),
    }));

    function remap(html, surah, ayah) {
        return html
            .replace(/data-surah-id="\d+"/, `data-surah-id="${surah}"`)
            .replace(/data-ayah-number="\d+"/, `data-ayah-number="${ayah}"`)
            .replace(/surah=\d+&amp;/g, `surah=${surah}&amp;`)
            .replace(/ayah=\d+&amp;/g, `ayah=${ayah}&amp;`);
    }
    let wrongBook = false;
    let failTranslation = false;
    globalThis.fetch = async (input) => {
        const url = new URL(input);
        expect(url.origin).toBe("https://api.quranpedia.net");
        requests.push(url.pathname + url.search);
        if (url.pathname === "/v1/topics")
            return Response.json(fixture.topicCatalogue);
        if (url.pathname === "/v1/ayah/1/2/book/180")
            return Response.json(fixture.grammarContent);
        if (url.pathname === "/embed") {
            if (
                url.searchParams.get("surah") === "1" &&
                url.searchParams.get("ayah") === "2" &&
                url.searchParams.get("type") === "asbab"
            ) {
                return new Response(fixture.singleBookAsbab);
            }
            return new Response(
                remap(
                    fixture[url.searchParams.get("type")],
                    url.searchParams.get("surah"),
                    url.searchParams.get("ayah"),
                ),
            );
        }
        if (url.pathname.startsWith("/v1/translations/available-languages/"))
            return Response.json(fixture.languages);
        if (url.pathname.startsWith("/v1/translations/")) {
            if (failTranslation) throw new Error("Test outage");
            const ayah = Number(url.pathname.split("/").at(-2));
            return Response.json(
                fixture.translations.map((entry) => ({
                    ...entry,
                    "translation-content": `<p>Translation ${ayah}</p><script>attack()</script>`,
                })),
            );
        }
        if (url.pathname === "/v1/book/491")
            return Response.json({
                id: 491,
                name: "السراج",
                author: { ar_name: "الخضيري" },
            });
        if (url.pathname === "/v1/ayah/1/2/book/2919")
            return Response.json(fixture.singleBookContext);
        const book = Number(url.pathname.match(/book\/(\d+)$/)?.[1]);
        if (book)
            return Response.json({
                book: {
                    id: wrongBook ? 999 : book,
                    name: "Source book",
                    author: { ar_name: "Author" },
                },
                content:
                    book === 136
                        ? []
                        : [
                              {
                                  text: "<p>Shared commentary</p><script>attack()</script>",
                                  page: 3,
                                  part: 1,
                              },
                          ],
            });
        throw new Error(`Unexpected request: ${url}`);
    };
    afterAll(() => {
        globalThis.fetch = originalFetch;
    });
    const { default: getStudy } = await import(
        "../src/features/quran/server/get-ayah-study"
    );
    const { default: getReferences } = await import(
        "../src/features/quran/server/get-reader-references"
    );
    const request = { surahNumber: 2, ayahNumber: 255, riwayah: "hafs" };

    test("topics match whole references, validate selection and use canonical related text", async () => {
        const result = await getStudy({
            ...request,
            section: "topics",
            topicId: 1393,
        });
        expect(result.topics.find((topic) => topic.id === 1393).path).toContain(
            "الله جلّ جلاله",
        );
        expect(
            result.verses.map((verse) => `${verse.surah}:${verse.ayah}`),
        ).toEqual(["3:2", "20:111"]);
        expect(result.verses[0].text).toBe("Verse 3:2");
        expect(result.sourceUrl).toBe("https://quranpedia.net/topic/1393");
        await expect(
            getStudy({ ...request, section: "topics", topicId: 999999 }),
        ).rejects.toThrow();
        const noPartialMatch = await getStudy({
            ...request,
            ayahNumber: 25,
            section: "topics",
        });
        expect(noPartialMatch.topics).toEqual([]);
        const warsh = await getStudy({
            ...request,
            ayahNumber: 1,
            riwayah: "warsh",
            section: "topics",
            topicId: 1393,
        });
        expect(warsh.references).toEqual([255, 256]);
        expect(warsh.verses).toEqual(result.verses);
    });

    test("grammar loads the same sourced passage for Hafs and mapped Warsh", async () => {
        for (const [riwayah, ayahNumber] of [
            ["hafs", 2],
            ["warsh", 1],
        ]) {
            const result = await getStudy({
                surahNumber: 1,
                ayahNumber,
                riwayah,
                section: "e3rab",
                bookId: 180,
            });
            expect(result.selectedBook.id).toBe(180);
            expect(result.passages[0].text).toContain("بدل مجرور بالكسرة");
            expect(result.passages[0].references).toEqual([2]);
        }
    });

    test("Warsh reflections merge identical attributed notes across mapped verses", async () => {
        const result = await getStudy({
            ...request,
            ayahNumber: 1,
            riwayah: "warsh",
            section: "notes",
        });
        expect(result.notes).toHaveLength(
            parseStudyNotes(fixture.notes, 2, 255).length,
        );
        expect(result.notes[0].references).toEqual([255, 256]);
        expect(result.notes[0].attribution).toBe("عبدالله بلقاسم");
    });

    test("Fatiha revelation context loads for Hafs 1:2 and Warsh 1:1", async () => {
        for (const [riwayah, ayahNumber] of [
            ["hafs", 2],
            ["warsh", 1],
        ]) {
            const result = await getStudy({
                surahNumber: 1,
                ayahNumber,
                riwayah,
                section: "asbab",
            });
            expect(result.references).toEqual([2]);
            expect(result.books.map((book) => book.id)).toEqual([2919]);
            expect(result.selectedBook.name).toBe(
                "أسباب نزول القرآن - الواحدي",
            );
            expect(result.passages.length).toBeGreaterThan(0);
            expect(result.passages[0].text).toContain("القول في سورة الفاتحة");
            expect(result.passages[0].references).toEqual([2]);
            expect(result.sourceUrl).toBe(
                "https://api.quranpedia.net/embed?surah=1&ayah=2&type=asbab&book=2919",
            );
        }
    });

    test("study validates input before issuing network requests", async () => {
        const count = requests.length;
        for (const override of [
            { surahNumber: 0 },
            { ayahNumber: 287 },
            { riwayah: "unknown" },
            { section: "unknown" },
            { language: "../en" },
        ]) {
            await expect(
                getStudy({ ...request, section: "tafsir", ...override }),
            ).rejects.toThrow();
        }
        expect(requests).toHaveLength(count);
    });

    test("public tafsir browsing honors preferred books and rejects unrelated book IDs", async () => {
        const data = await getStudy({
            ...request,
            section: "tafsir",
            preferredBookId: 4,
        });
        expect(data.selectedBook.id).toBe(4);
        expect(data.selectedBook.author).toBe("Author");
        expect(data.passages[0].text).toBe("Shared commentary");
        expect(data.passages[0].page).toBe(3);
        expect(
            requests.some((url) => url.startsWith("/v1/translations/")),
        ).toBe(false);
        const count = requests.length;
        await expect(
            getStudy({ ...request, section: "tafsir", bookId: 9999 }),
        ).rejects.toThrow();
        expect(
            requests.slice(count).some((url) => url.includes("book/9999")),
        ).toBe(false);
        expect(
            (await getStudy({ ...request, section: "tafsir", bookId: 136 }))
                .passages,
        ).toEqual([]);
    });

    test("Warsh study covers all mapped references and removes repeated commentary", async () => {
        const data = await getStudy({
            ...request,
            ayahNumber: 1,
            riwayah: "warsh",
            section: "tafsir",
        });
        expect(data.references).toEqual([255, 256]);
        expect(data.passages).toHaveLength(1);
        expect(data.passages[0].references).toEqual([255, 256]);
        const fatiha = await getReferences(1, 1, "warsh");
        expect(fatiha.map((verse) => verse.numberInSurah)).toEqual([2]);
        for (const ayah of [6, 7])
            expect(
                (await getReferences(1, ayah, "warsh")).map(
                    (verse) => verse.numberInSurah,
                ),
            ).toEqual([7]);
        await expect(getReferences(1, 5, "warsh")).rejects.toThrow();
    });

    test("word definitions and revelation context retain source identity", async () => {
        const meanings = await getStudy({ ...request, section: "meanings" });
        expect(meanings.meanings).toHaveLength(4);
        expect(meanings.selectedBook.id).toBe(491);
        expect(meanings.sourceUrl).toContain("book=491");
        const context = await getStudy({
            ...request,
            ayahNumber: 115,
            section: "asbab",
        });
        expect(context.selectedBook.id).toBe(2919);
        wrongBook = true;
        try {
            await expect(
                getStudy({ ...request, section: "tafsir", bookId: 4 }),
            ).rejects.toThrow("Unexpected Quranpedia book");
        } finally {
            wrongBook = false;
        }
    });

    test("translation comparison preserves separate mapped verses and language direction", async () => {
        const data = await getStudy({
            ...request,
            ayahNumber: 1,
            riwayah: "warsh",
            section: "translations",
            language: "fa",
        });
        expect(
            data.languages.find((language) => language.code === "fa").direction,
        ).toBe("rtl");
        expect(data.translations[0].passages).toEqual([
            { text: "Translation 255", references: [255] },
            { text: "Translation 256", references: [256] },
        ]);
        await expect(
            getStudy({ ...request, section: "translations", language: "zz" }),
        ).rejects.toThrow();
    });

    test("similar verses use validated canonical text and internal reader targets", async () => {
        const data = await getStudy({ ...request, section: "similar" });
        const verse = data.groups[0].verses[0];
        expect(verse.surah).toBe(3);
        expect(verse.ayah).toBe(2);
        expect(verse.text).toBe("Verse 3:2");
        expect(verse.globalNumber).toBe(602);
    });

    test("upstream failures can be retried without poisoning subsequent study requests", async () => {
        failTranslation = true;
        try {
            await expect(
                getStudy({ ...request, section: "translations" }),
            ).rejects.toThrow();
        } finally {
            failTranslation = false;
        }
        expect(
            (await getStudy({ ...request, section: "translations" }))
                .translations.length,
        ).toBeGreaterThan(0);
    });
}
