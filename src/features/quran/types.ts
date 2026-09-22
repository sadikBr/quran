export interface PageData {
    code: number;
    status: string;
    data: Data;
}

export interface Data {
    number: number;
    ayahs: AyahType[];
    surahs: Surahs;
    edition: Edition;
}

export interface AyahType {
    number: number;
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
