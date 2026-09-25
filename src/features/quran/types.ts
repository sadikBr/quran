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
    bitrate_kbps?: number;
    scope: "ayah" | "surah";
    url: string;
    recitation?: string;
    surah_total?: number;
    surah_files?: number;
}
