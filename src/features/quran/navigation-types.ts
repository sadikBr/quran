export interface QuranDivisionReference {
    number: number;
    surahNumber: number;
    ayahNumber: number;
    globalAyahNumber: number;
    pageNumber: number;
}

export interface QuranNavigationMeta {
    juzs: QuranDivisionReference[];
    hizbs: QuranDivisionReference[];
    hizbQuarters: QuranDivisionReference[];
}

export interface QuranDivisionMarker {
    globalAyahNumber: number;
    juzNumber?: number;
    hizbNumber?: number;
    hizbQuarterNumber?: number;
}
