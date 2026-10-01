"use server";

import { z } from "zod";
import { quranpediaPlainText } from "../helpers/quranpedia-data";
import {
    mergeStudyPassages,
    parseSimilarReferences,
    parseStudyBooks,
    parseStudyMeanings,
    parseStudyNotes,
    validateStudyFragment,
} from "../helpers/quranpedia-study";
import { QURANPEDIA_EDITIONS } from "../quranpedia-editions";
import {
    type AyahStudyData,
    STUDY_SECTIONS,
    type StudyBook,
    type StudyLanguage,
    type StudyNote,
    type StudyTranslation,
    studySourceUrl,
} from "../study-types";
import fetchQuranpedia, {
    createQuranpediaCache,
    QURANPEDIA_REVALIDATE_SECONDS,
} from "./fetch-quranpedia";
import getQuranCorpus from "./get-quran-corpus";
import getReaderReferences from "./get-reader-references";

const requestSchema = z.object({
    surahNumber: z.number().int().min(1).max(114),
    ayahNumber: z.number().int().min(1).max(286),
    riwayah: z.enum(["hafs", "warsh"]),
    section: z.enum(STUDY_SECTIONS),
    bookId: z.number().int().positive().optional(),
    preferredBookId: z.number().int().positive().optional(),
    language: z
        .string()
        .regex(/^[a-zA-Z-]{2,16}$/)
        .optional(),
    topicId: z.number().int().positive().optional(),
});
const bookSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    author: z.object({ ar_name: z.string() }).nullable().optional(),
});
const passageSchema = z.object({
    book: bookSchema,
    content: z.array(
        z.object({
            text: z.string(),
            page: z.coerce.number().int().positive().nullish(),
            part: z.coerce.number().int().positive().nullish(),
        }),
    ),
});
const languagesSchema = z.array(
    z.object({
        code: z.string(),
        name: z.string(),
        en_name: z.string(),
        local_name: z.string(),
        direction: z.enum(["ltr", "rtl"]),
    }),
);
const translationsSchema = z.array(
    z.object({
        book: z.object({
            id: z.number().int().positive(),
            name: z.string(),
            authors: z.array(z.object({ ar_name: z.string() })).optional(),
        }),
        "translation-content": z.string(),
    }),
);
const fragments = createQuranpediaCache<string>(48);
const topicsSchema = z.array(
    z.object({
        id: z.number().int().positive(),
        name: z.string(),
        parent_id: z.number().int().positive().nullable(),
        ayahs: z.string().regex(/^(?:\d+:\d+(?:,\d+:\d+)*)?$/),
    }),
);
const topicCatalogues = createQuranpediaCache<z.infer<typeof topicsSchema>>(1);

async function fragment(
    surah: number,
    ayah: number,
    section: Exclude<
        (typeof STUDY_SECTIONS)[number],
        "translations" | "topics"
    >,
    book?: number,
) {
    const url = `${studySourceUrl(surah, ayah, section, book)}&fragment=1&fonts=0`;
    return fragments(url, async () => {
        const response = await fetch(url, {
            next: { revalidate: QURANPEDIA_REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok)
            throw new Error("Quranpedia study content is unavailable.");
        if (Number(response.headers.get("content-length")) > 2_000_000)
            throw new Error("Quranpedia study content is too large.");
        const html = await response.text();
        if (html.length > 2_000_000)
            throw new Error("Quranpedia study content is too large.");
        return validateStudyFragment(html, surah, ayah, section);
    });
}

function bookMetadata(book: z.infer<typeof bookSchema>): StudyBook {
    return {
        id: book.id,
        name: quranpediaPlainText(book.name),
        author: book.author
            ? quranpediaPlainText(book.author.ar_name)
            : undefined,
    };
}

export default async function getAyahStudy(
    input: z.infer<typeof requestSchema>,
): Promise<AyahStudyData> {
    const {
        surahNumber,
        ayahNumber,
        riwayah,
        section,
        bookId,
        preferredBookId,
        language,
        topicId,
    } = requestSchema.parse(input);
    const mapped = await getReaderReferences(surahNumber, ayahNumber, riwayah);
    const references = mapped.map((ayah) => ayah.numberInSurah);
    const available = mapped.filter((ayah) =>
        ayah.studyOptions?.includes(section),
    );
    const base = {
        references,
        sourceUrl: studySourceUrl(surahNumber, references[0], section, bookId),
    };

    if (section === "topics") {
        if (!available.length)
            return { ...base, section, topics: [], verses: [] };
        const [catalogue, corpus] = await Promise.all([
            topicCatalogues("topics", async () =>
                topicsSchema.parse(await fetchQuranpedia("/v1/topics")),
            ),
            getQuranCorpus(),
        ]);
        const byId = new Map(catalogue.map((item) => [item.id, item]));
        const current = new Set(
            mapped.map((ayah) => `${surahNumber}:${ayah.numberInSurah}`),
        );
        const matching = catalogue.filter((item) =>
            item.ayahs.split(",").some((ref) => current.has(ref)),
        );
        const topics = matching.map((item) => {
            const path: string[] = [];
            const seen = new Set([item.id]);
            let parent = item.parent_id ? byId.get(item.parent_id) : undefined;
            while (parent && !seen.has(parent.id)) {
                seen.add(parent.id);
                path.unshift(quranpediaPlainText(parent.name));
                parent = parent.parent_id
                    ? byId.get(parent.parent_id)
                    : undefined;
            }
            return {
                id: item.id,
                name: quranpediaPlainText(item.name),
                path,
                verseCount: new Set(
                    item.ayahs.split(",").filter((ref) => !current.has(ref)),
                ).size,
            };
        });
        const selected = topicId
            ? matching.find((item) => item.id === topicId)
            : matching[0];
        if (topicId && !selected)
            throw new Error("That topic is not linked to this ayah.");
        const verses = [...new Set(selected?.ayahs.split(",") ?? [])].flatMap(
            (reference) => {
                if (current.has(reference)) return [];
                const [surah, ayah] = reference.split(":").map(Number);
                const verse = corpus.surahs[surah - 1]?.ayahs[ayah - 1];
                if (!verse) throw new Error("Invalid topic verse reference.");
                return [
                    {
                        surah,
                        ayah,
                        globalNumber: verse.number,
                        text: verse.text,
                        surahName: verse.surah.name,
                        surahEnglishName: verse.surah.englishName,
                    },
                ];
            },
        );
        return {
            ...base,
            section,
            topics,
            topicId: selected?.id,
            verses,
            sourceUrl: selected
                ? `https://quranpedia.net/topic/${selected.id}`
                : base.sourceUrl,
        };
    }

    if (section === "notes") {
        const entries = await Promise.all(
            available.map(async (ayah) =>
                parseStudyNotes(
                    await fragment(surahNumber, ayah.numberInSurah, section),
                    surahNumber,
                    ayah.numberInSurah,
                ),
            ),
        );
        const notes = new Map<string, StudyNote>();
        for (const entry of entries.flat()) {
            const key = JSON.stringify([
                entry.text,
                entry.attribution,
                entry.category,
                entry.hasAttachments,
            ]);
            const previous = notes.get(key);
            if (previous)
                previous.references = [
                    ...new Set([...previous.references, ...entry.references]),
                ];
            else notes.set(key, entry);
        }
        return { ...base, section, notes: [...notes.values()] };
    }

    if (section === "translations") {
        const languageLists = await Promise.all(
            available.map(async (ayah) =>
                languagesSchema.parse(
                    await fetchQuranpedia(
                        `/v1/translations/available-languages/${surahNumber}/${ayah.numberInSurah}`,
                    ),
                ),
            ),
        );
        const languages = [
            ...new Map(
                languageLists
                    .flat()
                    .filter((item) => /^[a-zA-Z-]{2,16}$/.test(item.code))
                    .map((item) => [
                        item.code,
                        {
                            code: item.code,
                            name: item.en_name || item.name,
                            localName: item.local_name || item.en_name,
                            direction: item.direction,
                        } satisfies StudyLanguage,
                    ]),
            ).values(),
        ];
        const chosen =
            language ??
            (languages.some((item) => item.code === "en")
                ? "en"
                : (languages[0]?.code ?? "en"));
        if (language && !languages.some((item) => item.code === language))
            throw new Error("That translation language is not available.");
        const entries = await Promise.all(
            available.map(async (ayah, index) => {
                if (!languageLists[index].some((item) => item.code === chosen))
                    return [];
                return translationsSchema
                    .parse(
                        await fetchQuranpedia(
                            `/v1/translations/${surahNumber}/${ayah.numberInSurah}/${chosen}`,
                        ),
                    )
                    .map((item) => ({
                        id: item.book.id,
                        name:
                            QURANPEDIA_EDITIONS.find(
                                (edition) =>
                                    edition.identifier ===
                                    `quranpedia.translation.${item.book.id}`,
                            )?.englishName ??
                            quranpediaPlainText(item.book.name),
                        author: item.book.authors
                            ?.map((author) =>
                                quranpediaPlainText(author.ar_name),
                            )
                            .join("، "),
                        passages: [
                            {
                                text: quranpediaPlainText(
                                    item["translation-content"],
                                ),
                                references: [ayah.numberInSurah],
                            },
                        ],
                    }));
            }),
        );
        const translations = new Map<number, StudyTranslation>();
        for (const entry of entries.flat()) {
            if (!entry.passages[0].text) continue;
            const previous = translations.get(entry.id);
            if (previous) previous.passages.push(...entry.passages);
            else translations.set(entry.id, entry);
        }
        return {
            ...base,
            section,
            languages,
            language: chosen,
            translations: [...translations.values()],
        };
    }

    if (section === "similar") {
        const [corpus, results] = await Promise.all([
            getQuranCorpus(),
            Promise.all(
                available.map(async (ayah) =>
                    parseSimilarReferences(
                        await fragment(
                            surahNumber,
                            ayah.numberInSurah,
                            section,
                        ),
                        surahNumber,
                        ayah.numberInSurah,
                    ),
                ),
            ),
        ]);
        const groups: Extract<AyahStudyData, { section: "similar" }>["groups"] =
            [];
        for (const group of results.flat()) {
            let target = groups.find((item) => item.type === group.type);
            if (!target) {
                target = { type: group.type, verses: [] };
                groups.push(target);
            }
            for (const ref of group.references) {
                const verse = corpus.surahs[ref.surah - 1]?.ayahs[ref.ayah - 1];
                if (!verse) throw new Error("Invalid similar verse reference.");
                if (
                    (ref.surah === surahNumber &&
                        references.includes(ref.ayah)) ||
                    target.verses.some(
                        (item) => item.globalNumber === verse.number,
                    )
                )
                    continue;
                target.verses.push({
                    ...ref,
                    globalNumber: verse.number,
                    text: verse.text,
                    surahName: verse.surah.name,
                    surahEnglishName: verse.surah.englishName,
                });
            }
        }
        return {
            ...base,
            section,
            groups: groups.filter((group) => group.verses.length),
        };
    }

    const catalogues = await Promise.all(
        available.map(async (ayah) => {
            const html = await fragment(
                surahNumber,
                ayah.numberInSurah,
                section,
            );
            return {
                ayah: ayah.numberInSurah,
                html,
                books: parseStudyBooks(
                    html,
                    surahNumber,
                    ayah.numberInSurah,
                    section,
                ),
            };
        }),
    );
    const books = [
        ...new Map(
            catalogues
                .flatMap((item) => item.books)
                .map((book) => [book.id, book]),
        ).values(),
    ];
    const selected = bookId
        ? books.find((book) => book.id === bookId)
        : (books.find((book) => book.id === (preferredBookId ?? 2012)) ??
          books[0]);
    if (bookId && !selected)
        throw new Error("That book is not available for this ayah.");
    if (!selected)
        return section === "meanings"
            ? { ...base, section, books, meanings: [] }
            : { ...base, section, books, passages: [] };
    const relevant = catalogues.filter((item) =>
        item.books.some((book) => book.id === selected.id),
    );
    const sourceUrl = studySourceUrl(
        surahNumber,
        relevant[0].ayah,
        section,
        selected.id,
    );

    if (section === "meanings") {
        const [metadata, definitions] = await Promise.all([
            fetchQuranpedia(`/v1/book/${selected.id}`).then((data) =>
                bookSchema.parse(data),
            ),
            Promise.all(
                relevant.map(async (item) =>
                    parseStudyMeanings(
                        await fragment(
                            surahNumber,
                            item.ayah,
                            section,
                            selected.id,
                        ),
                        surahNumber,
                        item.ayah,
                        selected.id,
                    ),
                ),
            ),
        ]);
        if (metadata.id !== selected.id)
            throw new Error("Unexpected Quranpedia book.");
        const meanings = new Map<
            string,
            { word: string; meaning: string; references: number[] }
        >();
        for (const entry of definitions.flat()) {
            const key = JSON.stringify([entry.word, entry.meaning]);
            const previous = meanings.get(key);
            if (previous)
                previous.references = [
                    ...new Set([...previous.references, ...entry.references]),
                ];
            else meanings.set(key, entry);
        }
        return {
            ...base,
            sourceUrl,
            section,
            books,
            selectedBook: bookMetadata(metadata),
            meanings: [...meanings.values()],
        };
    }

    const responses = await Promise.all(
        relevant.map(async (item) => {
            const response = passageSchema.parse(
                await fetchQuranpedia(
                    `/v1/ayah/${surahNumber}/${item.ayah}/book/${selected.id}`,
                ),
            );
            if (response.book.id !== selected.id)
                throw new Error("Unexpected Quranpedia book.");
            return {
                book: bookMetadata(response.book),
                passages: response.content.map((entry) => ({
                    text: quranpediaPlainText(entry.text),
                    references: [item.ayah],
                    page: entry.page ?? undefined,
                    part: entry.part ?? undefined,
                })),
            };
        }),
    );
    return {
        ...base,
        sourceUrl,
        section,
        books,
        selectedBook: responses[0].book,
        passages: mergeStudyPassages(
            responses.flatMap((item) => item.passages),
        ),
    };
}
