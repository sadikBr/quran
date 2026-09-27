import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import type { SurahType } from "@/features/quran/types";
import buildWirdTarget, {
    TOTAL_QURAN_AYAHS,
} from "@/features/wird/server/build-wird-target";
import type { KhatmahMeasurement } from "../types";

export function shiftDate(date: string, days: number) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

function weekday(date: string) {
    return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function nextReadingDate(date: string, restDays: number[]) {
    let result = date;
    for (let attempts = 0; attempts < 7; attempts += 1) {
        if (!restDays.includes(weekday(result))) return result;
        result = shiftDate(result, 1);
    }
    return date;
}

export function countCalendarDays(start: string, end: string) {
    if (start > end) return 0;
    let count = 0;
    let cursor = start;
    while (cursor <= end) {
        count += 1;
        cursor = shiftDate(cursor, 1);
    }
    return count;
}

export function countReadingDays(
    start: string,
    end: string,
    restDays: number[],
) {
    if (start > end) return 0;
    let count = 0;
    let cursor = start;
    while (cursor <= end) {
        if (!restDays.includes(weekday(cursor))) count += 1;
        cursor = shiftDate(cursor, 1);
    }
    return count;
}

function boundaries(
    measurement: KhatmahMeasurement,
    navigation: QuranNavigationMeta,
) {
    if (measurement === "page") return navigation.pages;
    if (measurement === "juz") return navigation.juzs;
    return navigation.hizbs;
}

function remainingUnits(
    measurement: KhatmahMeasurement,
    currentGlobalAyah: number,
    navigation: QuranNavigationMeta,
) {
    const items = boundaries(measurement, navigation);
    let currentIndex = 0;
    for (let index = 0; index < items.length; index += 1) {
        if (items[index].globalAyahNumber > currentGlobalAyah) break;
        currentIndex = index;
    }
    return Math.max(1, items.length - currentIndex);
}

export function buildAdaptiveKhatmahTarget(
    plan: {
        targetDate: string;
        durationWeeks: number;
        currentGlobalAyah: number;
        measurement: KhatmahMeasurement;
        restDays: number[];
    },
    currentDate: string,
    navigation: QuranNavigationMeta,
    surahs: SurahType[],
) {
    const targetDate =
        plan.targetDate < currentDate
            ? shiftDate(currentDate, plan.durationWeeks * 7)
            : plan.targetDate;
    const scheduledDate = nextReadingDate(currentDate, plan.restDays);
    const readingDays = Math.max(
        1,
        countReadingDays(scheduledDate, targetDate, plan.restDays),
    );
    const amount = Math.max(
        1,
        Math.ceil(
            remainingUnits(
                plan.measurement,
                plan.currentGlobalAyah,
                navigation,
            ) / readingDays,
        ),
    );
    const target = buildWirdTarget(
        plan.measurement,
        amount,
        Math.min(plan.currentGlobalAyah, TOTAL_QURAN_AYAHS),
        navigation,
        surahs,
    );

    return {
        ...target,
        startGlobalAyah: Math.min(plan.currentGlobalAyah, TOTAL_QURAN_AYAHS),
        amount,
        targetDate,
        scheduledDate,
        readingDays,
    };
}
