export type QuranSearchField = "arabic" | "translation";

export interface QuranSearchSnippet {
    before: string;
    match: string;
    after: string;
    leadingEllipsis: boolean;
    trailingEllipsis: boolean;
}

export interface QuranSearchResult {
    surahNumber: number;
    surahArabicName: string;
    surahEnglishName: string;
    surahEnglishNameTranslation: string;
    ayahNumber: number;
    globalAyahNumber: number;
    pageNumber: number;
    field: QuranSearchField;
    snippet: QuranSearchSnippet;
    arabicText: string;
}

export interface QuranSearchEditionSummary {
    identifier: string;
    name: string;
}

export interface QuranSearchResponse {
    query: string;
    results: QuranSearchResult[];
    total: number;
    truncated: boolean;
    editions: {
        arabic: QuranSearchEditionSummary;
        translation: QuranSearchEditionSummary;
    };
}
