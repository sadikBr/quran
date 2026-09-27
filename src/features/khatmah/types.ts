import { z } from "zod";

export const KHATMAH_MEASUREMENTS = ["page", "hizb", "juz"] as const;
export type KhatmahMeasurement = (typeof KHATMAH_MEASUREMENTS)[number];

export const khatmahPlanSchema = z.object({
    durationWeeks: z.number().int().min(1).max(52),
    repeatable: z.boolean(),
    startSurah: z.number().int().min(1).max(114),
    measurement: z.enum(KHATMAH_MEASUREMENTS),
    restDays: z.array(z.number().int().min(0).max(6)).max(6),
});

export interface KhatmahPlan {
    targetDate: string;
    durationWeeks: number;
    repeatable: boolean;
    startGlobalAyah: number;
    currentGlobalAyah: number;
    measurement: KhatmahMeasurement;
    restDays: number[];
    isActive: boolean;
    completed: boolean;
    progressPercentage: number;
    remainingDays: number;
    readingDaysRemaining: number;
    dailyAmount: number;
    nextReadingDate: string;
}

export interface KhatmahHistoryEntry {
    id: string;
    startedOn: string;
    completedDate: string;
    plannedWeeks: number;
    actualDays: number;
    readingDays: number;
    measurement: KhatmahMeasurement;
    fullKhatmah: boolean;
}

export interface KhatmahHistoryStats {
    totalCompleted: number;
    totalReadingDays: number;
    fastestDays: number | null;
    recent: KhatmahHistoryEntry[];
}
