export interface PageData {
    code: number;
    status: string;
    data: Data;
}

export interface EditionData {
    code: number;
    status: string;
    data: Edition[];
}

export interface Data {
    number: number;
    ayahs: AyahType[];
    surahs: Surahs;
    edition: Edition;
}

export interface AyahType {
    number: number;
    /** Hafs global ayah used by shared bookmarks, translations and progress. */
    hafsGlobalNumber?: number;
    /** All Hafs ayahs represented by this ayah (some Warsh boundaries differ). */
    hafsGlobalNumbers?: number[];
    /** Backwards-compatible hash target for links saved before Warsh migration. */
    legacyAnchorNumber?: number;
    audioNumber?: number;
    isBasmalaSentinel?: boolean;
    audio?: string;
    audioSecondary?: string[];
    text: string;
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
}

export interface Surahs {
    [key: string]: SurahType;
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

export type HostType = "everyayah" | "mp3quran" | "islamic_network";

export interface QuranJsonResponse {
    note: string;
    hosts: Record<HostType, Host>;
    reciters: Reciter[];
}

export interface Host {
    name: string;
    home: string;
    template: string;
    indexing: string;
    indexing_mode: string;
    surah_pad: number;
    ayah_pad: number;
    cors: boolean;
    accept_ranges: boolean;
    license_status: string;
    license: string;
    license_url: string;
}

export interface Reciter {
    id: string;
    host: HostType;
    name: string;
    arabicName?: string;
    bitrate_kbps?: number;
    scope: "ayah" | "surah";
    url: string;
    recitation?: string;
    surah_total?: number;
    surah_files?: number;
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
    description: string;
    image: string;
    bismillah: string;
    font_file: string;
    images: string;
    images_png: string | null;
    surahs: Array<{
        id: number;
        name: string;
        coded_name: string;
        ayahs: WarshVerse[];
    }>;
}
