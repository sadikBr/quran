import { z } from "zod";

export const WIRD_UNITS = [
    "ayah",
    "page",
    "quarter",
    "hizb",
    "juz",
    "surah",
] as const;

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
    progressVerse?: {
        riwayah: "hafs" | "warsh";
        surahNumber: number;
        ayahNumber: number;
    } | null;
    nextGoal?: { unit: string; amount: number } | null;
    unit: WirdUnit;
    amount: number;
    targetDate: string;
    completed: boolean;
    carriedOver: boolean;
    scheduledForFuture: boolean;
    progressGlobalAyah: number | null;
    start: WirdLocation;
    end: WirdLocation;
}

export interface WirdHistoryEntry {
    id: string;
    unit: WirdUnit;
    amount: number;
    targetDate: string;
    completedDate: string;
    carriedOver: boolean;
}

export interface WirdHistoryStats {
    currentStreak: number;
    longestStreak: number;
    totalCompleted: number;
    totals: Record<WirdUnit, number>;
    lastSevenDays: { date: string; completed: boolean }[];
    recent: WirdHistoryEntry[];
}
