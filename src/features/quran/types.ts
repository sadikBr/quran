import type { TajweedSegment } from "./helpers/quranpedia-tajweed";

export interface PageData {
    number: number;
    ayahs: AyahType[];
    surahs: Record<string, SurahType>;
    edition: Edition;
}

export interface AyahType {
    number: number;
    /** Hafs global ayah used by shared bookmarks, translations and progress. */
    hafsGlobalNumber?: number;
    /** All Hafs ayahs represented by this ayah (some Warsh boundaries differ). */
    hafsGlobalNumbers?: number[];
    audioNumber?: number;
    isBasmalaSentinel?: boolean;
    audio?: string;
    audioSecondary?: string[];
    text: string;
    tajweed?: TajweedSegment[];
    tajweedUnavailable?: boolean;
    surah: SurahType;
    numberInSurah: number;
    juz: number;
    manzil: number;
    page: number;
    ruku: number;
    hizbQuarter: number;
    sajda: boolean;
}

export interface AyahData extends AyahType {
    edition: Edition;
}

export interface SurahType {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
    numberOfAyahs: number;
    startingPage?: number;
}

export interface Edition {
    identifier: string;
    language: string;
    name: string;
    englishName: string;
    format: string;
    type: string;
    direction: string;
}

export interface Reciter {
    id: string;
    host: "quranpedia";
    name: string;
    arabicName?: string;
    bitrate_kbps?: number;
    scope: "ayah" | "surah";
    url: string;
    recitation?: string;
    surah_total?: number;
    surah_files?: number;
    availableSurahs?: number[];
}

export interface WarshChapter {
    id: number;
    name: string;
    coded_name: string;
    verses: WarshVerse[];
}

export interface WarshVerse {
    id: number;
    number: number;
    surah: string;
    page_number: number;
    text: string;
    marker: string;
    juz: number;
    hizb: number;
    ruku: number;
    manzil: number;
    options: string[];
    number_in_hafs: number[];
}

export interface WarshMushaf {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    bismillah: string;
    font_file: string | null;
    images?: string | null;
    images_png?: string | null;
    surahs: Array<{
        id: number;
        name: string;
        coded_name: string;
        ayahs: WarshVerse[];
    }>;
}
