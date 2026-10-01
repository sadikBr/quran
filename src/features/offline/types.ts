export const OFFLINE_QURAN_VERSION = "2026.10.01.2";

export type OfflineDataset = "hafs" | "warsh" | "translation";

export interface OfflineAyah {
    number: number;
    globalNumber?: number;
    text: string;
    page: number;
    juz: number;
    hizbQuarter: number;
    sajda?: boolean;
}

export interface OfflineSurah {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation?: string;
    revelationType?: string;
    ayahs: OfflineAyah[];
}

export interface OfflineQuranDataset {
    version: string;
    kind: OfflineDataset;
    edition: string;
    surahs: OfflineSurah[];
}

export interface OfflineLibraryStatus {
    state: "idle" | "downloading" | "ready" | "error";
    current?: number;
    total?: number;
    updatedAt?: string;
    version?: string;
}
