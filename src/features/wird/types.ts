import { z } from "zod";

export const WIRD_UNITS = ["ayah", "quarter", "hizb", "surah"] as const;

export type WirdUnit = (typeof WIRD_UNITS)[number];

export const wirdPreferenceSchema = z.object({
    unit: z.enum(WIRD_UNITS),
    amount: z.number().int().min(1).max(100),
});

export interface WirdLocation {
    globalAyahNumber: number;
    surahNumber: number;
    surahName: string;
    englishSurahName: string;
    ayahNumber: number;
    pageNumber: number;
}

export interface DailyWird {
    unit: WirdUnit;
    amount: number;
    targetDate: string;
    completed: boolean;
    carriedOver: boolean;
    progressGlobalAyah: number | null;
    start: WirdLocation;
    end: WirdLocation;
}
