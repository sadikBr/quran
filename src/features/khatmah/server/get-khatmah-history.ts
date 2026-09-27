import "server-only";

import { desc, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { userKhatmahHistory } from "@/drizzle/schema";
import getWirdDate from "@/features/wird/server/wird-date";
import type {
    KhatmahHistoryEntry,
    KhatmahHistoryStats,
    KhatmahMeasurement,
} from "../types";

export default async function getKhatmahHistory(
    userId: string,
): Promise<KhatmahHistoryStats> {
    let records: (typeof userKhatmahHistory.$inferSelect)[] = [];
    try {
        records = await db
            .select()
            .from(userKhatmahHistory)
            .where(eq(userKhatmahHistory.userId, userId))
            .orderBy(desc(userKhatmahHistory.completedAt));
    } catch {
        // Keep the Wird page available while the additive table is deployed.
    }

    const recent: KhatmahHistoryEntry[] = records.map((record) => ({
        id: record.id,
        startedOn: record.startedOn,
        completedDate: getWirdDate(record.completedAt),
        plannedWeeks: record.plannedWeeks,
        actualDays: record.actualDays,
        readingDays: record.readingDays,
        measurement: record.measurement as KhatmahMeasurement,
        fullKhatmah: record.startedGlobalAyah === 1,
    }));
    const full = recent.filter((entry) => entry.fullKhatmah);

    return {
        totalCompleted: full.length,
        totalReadingDays: full.reduce(
            (total, entry) => total + entry.readingDays,
            0,
        ),
        fastestDays:
            full.length > 0
                ? Math.min(...full.map((entry) => entry.actualDays))
                : null,
        recent: recent.slice(0, 12),
    };
}
