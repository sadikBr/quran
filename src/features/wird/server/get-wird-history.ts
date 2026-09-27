import "server-only";

import { desc, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { userWirdHistory } from "@/drizzle/schema";
import type { WirdHistoryEntry, WirdHistoryStats, WirdUnit } from "../types";
import getWirdDate from "./wird-date";

function shiftDate(date: string, days: number) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

function dayDistance(first: string, second: string) {
    const firstDate = new Date(`${first}T12:00:00Z`).getTime();
    const secondDate = new Date(`${second}T12:00:00Z`).getTime();
    return Math.round((secondDate - firstDate) / 86_400_000);
}

const EMPTY_TOTALS: Record<WirdUnit, number> = {
    ayah: 0,
    page: 0,
    quarter: 0,
    hizb: 0,
    juz: 0,
    surah: 0,
};

export default async function getWirdHistory(
    userId: string,
): Promise<WirdHistoryStats> {
    let records: (typeof userWirdHistory.$inferSelect)[] = [];

    try {
        records = await db
            .select()
            .from(userWirdHistory)
            .where(eq(userWirdHistory.userId, userId))
            .orderBy(desc(userWirdHistory.completedAt));
    } catch {
        // Keep the dashboard available until the additive history migration
        // has been applied in every environment.
    }

    const entries: WirdHistoryEntry[] = records.map((record) => {
        const completedDate = getWirdDate(record.completedAt);
        return {
            id: record.id,
            unit: record.unit as WirdUnit,
            amount: record.amount,
            targetDate: record.targetDate,
            completedDate,
            carriedOver: completedDate > record.targetDate,
        };
    });
    const completionDates = [
        ...new Set(entries.map((entry) => entry.completedDate)),
    ].sort();
    const completedSet = new Set(completionDates);
    const currentDate = getWirdDate();
    let streakCursor = completedSet.has(currentDate)
        ? currentDate
        : shiftDate(currentDate, -1);
    let currentStreak = 0;

    while (completedSet.has(streakCursor)) {
        currentStreak += 1;
        streakCursor = shiftDate(streakCursor, -1);
    }

    let longestStreak = 0;
    let runningStreak = 0;
    let previousDate: string | null = null;
    for (const date of completionDates) {
        runningStreak =
            previousDate && dayDistance(previousDate, date) === 1
                ? runningStreak + 1
                : 1;
        longestStreak = Math.max(longestStreak, runningStreak);
        previousDate = date;
    }

    const totals = { ...EMPTY_TOTALS };
    for (const entry of entries) totals[entry.unit] += entry.amount;

    return {
        currentStreak,
        longestStreak,
        totalCompleted: entries.length,
        totals,
        lastSevenDays: Array.from({ length: 7 }, (_, index) => {
            const date = shiftDate(currentDate, index - 6);
            return { date, completed: completedSet.has(date) };
        }),
        recent: entries.slice(0, 8),
    };
}
