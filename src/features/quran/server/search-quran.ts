import "server-only";

import type { Riwayah } from "@/features/settings/preferences";
import {
    createSearchSnippet,
    normalizeSearchText,
    normalizeSearchTextWithMap,
    stripQuranMarkup,
} from "../helpers/normalize-quran-search";
import type {
    QuranSearchField,
    QuranSearchResponse,
    QuranSearchResult,
} from "../search-types";
import type { AyahType, Edition, SurahType, WarshChapter } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

const QURAN_JSON_BASE_URL = "https://quran-json.risanb.com";
const MAX_CACHED_CORPORA = 8;
const MAX_CACHED_EDITIONS = 16;
const MAX_RESULTS = 50;

interface CompleteSurah extends SurahType {
    ayahs: Array<Omit<AyahType, "surah">>;
}

interface CompleteEditionResponse {
    data: {
        surahs: CompleteSurah[];
        edition: Edition;
    };
}

interface SearchDocument {
    surahNumber: number;
    surahArabicName: string;
    surahEnglishName: string;
    surahEnglishNameTranslation: string;
    ayahNumber: number;
    globalAyahNumber: number;
    pageNumber: number;
    arabicText: string;
    translationText: string;
    normalizedArabic: ReturnType<typeof normalizeSearchTextWithMap>;
    normalizedTranslation: ReturnType<typeof normalizeSearchTextWithMap>;
}

interface SearchCorpus {
    documents: SearchDocument[];
    arabicEdition: { identifier: string; name: string };
    translationEdition: { identifier: string; name: string };
}

const corpusCache = new Map<string, Promise<SearchCorpus>>();
const editionCache = new Map<string, Promise<CompleteEditionResponse>>();
let warshQuranCache: Promise<WarshChapter[]> | undefined;

function rememberCorpus(key: string, corpus: Promise<SearchCorpus>) {
    if (!corpusCache.has(key) && corpusCache.size >= MAX_CACHED_CORPORA) {
        const oldestKey = corpusCache.keys().next().value;
        if (oldestKey) corpusCache.delete(oldestKey);
    }

    corpusCache.set(key, corpus);
    corpus.catch(() => corpusCache.delete(key));
    return corpus;
}

async function getCompleteEdition(identifier: string) {
    const cached = editionCache.get(identifier);
    if (cached) return cached;

    if (editionCache.size >= MAX_CACHED_EDITIONS) {
        const oldestKey = editionCache.keys().next().value;
        if (oldestKey) editionCache.delete(oldestKey);
    }

    const edition = fetchQuranCloud<CompleteEditionResponse>(
        `/quran/${identifier}`,
        { cache: "no-store" },
    );
    editionCache.set(identifier, edition);
    edition.catch(() => editionCache.delete(identifier));
    return edition;
}

async function getCompleteWarshQuran(): Promise<WarshChapter[]> {
    if (warshQuranCache) return warshQuranCache;

    warshQuranCache = fetchWarshQuran();
    warshQuranCache.catch(() => {
        warshQuranCache = undefined;
    });
    return warshQuranCache;
}

async function fetchWarshQuran(): Promise<WarshChapter[]> {
    let response: Response;

    try {
        response = await fetch(`${QURAN_JSON_BASE_URL}/text/warsh/quran.json`, {
            cache: "no-store",
        });
    } catch (error) {
        console.error("Unable to reach Quran JSON for Warsh search.", error);
        throw new Error("Unable to load the Warsh search corpus.");
    }

    if (!response.ok) {
        console.error("Quran JSON returned a Warsh search error.", {
            status: response.status,
            statusText: response.statusText,
        });
        throw new Error("Unable to load the Warsh search corpus.");
    }

    return response.json();
}

function editionName(edition: Edition) {
    return edition.englishName || edition.name || edition.identifier;
}

function buildHafsDocuments(
    arabic: CompleteEditionResponse,
    translation: CompleteEditionResponse,
): SearchDocument[] {
    const translatedSurahs = new Map(
        translation.data.surahs.map((surah) => [surah.number, surah]),
    );

    return arabic.data.surahs.flatMap((surah) => {
        const translatedAyahs = new Map(
            (translatedSurahs.get(surah.number)?.ayahs ?? []).map((ayah) => [
                ayah.numberInSurah,
                ayah,
            ]),
        );

        return surah.ayahs.map((ayah) => {
            const arabicText = stripQuranMarkup(ayah.text);
            const translationText =
                translatedAyahs.get(ayah.numberInSurah)?.text ?? "";

            return {
                surahNumber: surah.number,
                surahArabicName: surah.name,
                surahEnglishName: surah.englishName,
                surahEnglishNameTranslation: surah.englishNameTranslation,
                ayahNumber: ayah.numberInSurah,
                globalAyahNumber: ayah.number,
                pageNumber: ayah.page,
                arabicText,
                translationText,
                normalizedArabic: normalizeSearchTextWithMap(arabicText),
                normalizedTranslation:
                    normalizeSearchTextWithMap(translationText),
            };
        });
    });
}

function buildWarshDocuments(
    hafs: CompleteEditionResponse,
    warsh: WarshChapter[],
    translation: CompleteEditionResponse,
): SearchDocument[] {
    const hafsSurahs = new Map(
        hafs.data.surahs.map((surah) => [surah.number, surah]),
    );
    const translatedSurahs = new Map(
        translation.data.surahs.map((surah) => [surah.number, surah]),
    );

    return warsh.flatMap((chapter) => {
        const hafsSurah = hafsSurahs.get(chapter.id);
        if (!hafsSurah) return [];

        const hafsAyahs = new Map(
            hafsSurah.ayahs.map((ayah) => [ayah.numberInSurah, ayah]),
        );
        const translatedAyahs = new Map(
            (translatedSurahs.get(chapter.id)?.ayahs ?? []).map((ayah) => [
                ayah.numberInSurah,
                ayah,
            ]),
        );

        return chapter.verses.flatMap((verse) => {
            const mappedHafsNumbers =
                chapter.id === 1 && verse.id === 1 ? [2] : verse.number_in_hafs;
            const anchor = hafsAyahs.get(mappedHafsNumbers[0]);
            if (!anchor) return [];

            const translationText = mappedHafsNumbers
                .map((number) => translatedAyahs.get(number)?.text ?? "")
                .filter(Boolean)
                .join(" ");
            const arabicText = stripQuranMarkup(verse.text);

            return [
                {
                    surahNumber: chapter.id,
                    surahArabicName: hafsSurah.name,
                    surahEnglishName: hafsSurah.englishName,
                    surahEnglishNameTranslation:
                        hafsSurah.englishNameTranslation,
                    ayahNumber: verse.id,
                    globalAyahNumber: anchor.number,
                    pageNumber: anchor.page,
                    arabicText,
                    translationText,
                    normalizedArabic: normalizeSearchTextWithMap(arabicText),
                    normalizedTranslation:
                        normalizeSearchTextWithMap(translationText),
                },
            ];
        });
    });
}

async function buildSearchCorpus(
    arabicEdition: string,
    translationEdition: string,
    riwayah: Riwayah,
): Promise<SearchCorpus> {
    const translationPromise = getCompleteEdition(translationEdition);

    if (riwayah === "warsh") {
        const [hafs, warsh, translation] = await Promise.all([
            getCompleteEdition("quran-simple"),
            getCompleteWarshQuran(),
            translationPromise,
        ]);

        return {
            documents: buildWarshDocuments(hafs, warsh, translation),
            arabicEdition: {
                identifier: "warsh",
                name: "Warsh ‘an Nafi‘",
            },
            translationEdition: {
                identifier: translation.data.edition.identifier,
                name: editionName(translation.data.edition),
            },
        };
    }

    const [arabic, translation] = await Promise.all([
        getCompleteEdition(arabicEdition),
        translationPromise,
    ]);

    return {
        documents: buildHafsDocuments(arabic, translation),
        arabicEdition: {
            identifier: arabic.data.edition.identifier,
            name: editionName(arabic.data.edition),
        },
        translationEdition: {
            identifier: translation.data.edition.identifier,
            name: editionName(translation.data.edition),
        },
    };
}

function getSearchCorpus(
    arabicEdition: string,
    translationEdition: string,
    riwayah: Riwayah,
) {
    const key = [riwayah, arabicEdition, translationEdition].join(":");
    return (
        corpusCache.get(key) ??
        rememberCorpus(
            key,
            buildSearchCorpus(arabicEdition, translationEdition, riwayah),
        )
    );
}

function matchScore(value: string, query: string) {
    const index = value.indexOf(query);
    if (index < 0) return null;
    if (value === query) return 0;
    if (index === 0) return 1;
    if (value[index - 1] === " ") return 2;
    return 3;
}

export default async function searchQuran({
    query,
    arabicEdition,
    translationEdition,
    riwayah,
}: {
    query: string;
    arabicEdition: string;
    translationEdition: string;
    riwayah: Riwayah;
}): Promise<QuranSearchResponse> {
    const normalizedQuery = normalizeSearchText(query).slice(0, 160);
    const corpus = await getSearchCorpus(
        arabicEdition,
        translationEdition,
        riwayah,
    );

    if (normalizedQuery.length < 2) {
        return {
            query,
            results: [],
            total: 0,
            truncated: false,
            editions: {
                arabic: corpus.arabicEdition,
                translation: corpus.translationEdition,
            },
        };
    }

    const field: QuranSearchField = /[\u0600-\u06ff]/u.test(normalizedQuery)
        ? "arabic"
        : "translation";
    const matches = corpus.documents
        .map((document) => {
            const normalized =
                field === "arabic"
                    ? document.normalizedArabic
                    : document.normalizedTranslation;
            const score = matchScore(normalized.value, normalizedQuery);
            return score === null ? null : { document, normalized, score };
        })
        .filter(
            (
                match,
            ): match is {
                document: SearchDocument;
                normalized: ReturnType<typeof normalizeSearchTextWithMap>;
                score: number;
            } => match !== null,
        )
        .sort(
            (left, right) =>
                left.score - right.score ||
                left.document.globalAyahNumber -
                    right.document.globalAyahNumber ||
                left.document.ayahNumber - right.document.ayahNumber,
        );

    const results: QuranSearchResult[] = matches
        .slice(0, MAX_RESULTS)
        .map(({ document, normalized }) => {
            const matchedText =
                field === "arabic"
                    ? document.arabicText
                    : document.translationText;

            return {
                surahNumber: document.surahNumber,
                surahArabicName: document.surahArabicName,
                surahEnglishName: document.surahEnglishName,
                surahEnglishNameTranslation:
                    document.surahEnglishNameTranslation,
                ayahNumber: document.ayahNumber,
                globalAyahNumber: document.globalAyahNumber,
                pageNumber: document.pageNumber,
                field,
                snippet: createSearchSnippet(
                    matchedText,
                    normalized,
                    normalizedQuery,
                ),
                arabicText: document.arabicText,
            };
        });

    return {
        query,
        results,
        total: matches.length,
        truncated: matches.length > MAX_RESULTS,
        editions: {
            arabic: corpus.arabicEdition,
            translation: corpus.translationEdition,
        },
    };
}
