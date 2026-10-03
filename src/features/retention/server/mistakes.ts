import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    memorizationMistakeEvent as event,
    memorizationMistake as mistake,
} from "@/drizzle/schema";
import {
    isMemorized,
    type MemoryCatalogue,
    type Riwayah,
} from "@/features/memorization/progress";
import { lockRecord } from "@/features/memorization/server/record-service";
import type { MistakeInput, MistakeView } from "../types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The caller supplies authorized ownership; circle callers validate the assignment range first. */
export async function recordMistake(
    tx: Tx,
    userId: string,
    reporterId: string,
    riwayah: Riwayah,
    input: MistakeInput,
    eventId: string,
    catalogue: MemoryCatalogue,
) {
    if (
        !catalogue[riwayah].some(
            (v) =>
                v.surahNumber === input.surahNumber &&
                v.ayahNumber === input.ayahNumber,
        )
    )
        throw new Error("Invalid ayah.");
    await lockRecord(tx, userId);
    const [duplicate] = await tx
        .select({ id: event.id })
        .from(event)
        .where(and(eq(event.id, eventId), eq(event.userId, userId)));
    if (duplicate) return;
    const [saved] = await tx
        .insert(mistake)
        .values({
            id: crypto.randomUUID(),
            userId,
            riwayah,
            ...input,
            reportedById: reporterId,
            createdAt: sql`clock_timestamp()`,
            lastOccurredAt: sql`clock_timestamp()`,
            updatedAt: sql`clock_timestamp()`,
        })
        .onConflictDoUpdate({
            target: [
                mistake.userId,
                mistake.riwayah,
                mistake.surahNumber,
                mistake.ayahNumber,
                mistake.kind,
            ],
            set: {
                note: input.note || sql`${mistake.note}`,
                occurrences: sql`${mistake.occurrences} + 1`,
                revision: sql`${mistake.revision} + 1`,
                resolvedAt: null,
                reportedById: reporterId,
                lastOccurredAt: sql`clock_timestamp()`,
                updatedAt: sql`clock_timestamp()`,
            },
        })
        .returning({ id: mistake.id });
    await tx.insert(event).values({
        id: eventId,
        userId,
        mistakeId: saved.id,
        action: "noticed",
        createdAt: sql`clock_timestamp()`,
    });
}

export async function changeMistake(
    tx: Tx,
    userId: string,
    input: {
        id: string;
        revision: number;
        action: "practised" | "resolved" | "reopened";
        eventId: string;
    },
    catalogue: MemoryCatalogue,
    covered: Set<string>,
) {
    await lockRecord(tx, userId);
    const [duplicate] = await tx
        .select()
        .from(event)
        .where(
            and(
                eq(event.id, input.eventId),
                eq(event.userId, userId),
                eq(event.mistakeId, input.id),
                eq(event.action, input.action),
            ),
        );
    if (duplicate) return { success: true as const };
    const [row] = await tx
        .select()
        .from(mistake)
        .where(and(eq(mistake.id, input.id), eq(mistake.userId, userId)))
        .for("update");
    if (!row || row.revision !== input.revision)
        return { success: false as const, reason: "stale" };
    const verse = catalogue[row.riwayah].find(
        (v) =>
            v.surahNumber === row.surahNumber &&
            v.ayahNumber === row.ayahNumber,
    );
    if (
        input.action === "practised" &&
        (!verse || !isMemorized(verse, covered) || row.resolvedAt)
    )
        return { success: false as const, reason: "unavailable" };
    if (
        (input.action === "resolved" && row.resolvedAt) ||
        (input.action === "reopened" && !row.resolvedAt)
    )
        return { success: false as const, reason: "stale" };
    await tx
        .update(mistake)
        .set({
            revision: row.revision + 1,
            practiceCount:
                input.action === "practised"
                    ? row.practiceCount + 1
                    : row.practiceCount,
            resolvedAt:
                input.action === "resolved"
                    ? sql`clock_timestamp()`
                    : input.action === "reopened"
                      ? null
                      : row.resolvedAt,
            updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(mistake.id, row.id));
    await tx.insert(event).values({
        id: input.eventId,
        userId,
        mistakeId: row.id,
        action: input.action,
        createdAt: sql`clock_timestamp()`,
    });
    return { success: true as const };
}

export async function listMistakes(
    userId: string,
    catalogue: MemoryCatalogue,
    covered: Set<string>,
): Promise<MistakeView[]> {
    const rows = await db
        .select()
        .from(mistake)
        .where(eq(mistake.userId, userId))
        .orderBy(
            desc(mistake.occurrences),
            desc(mistake.lastOccurredAt),
            mistake.id,
        );
    const known = new Set(
        (["hafs", "warsh"] as const).flatMap((riwayah) =>
            catalogue[riwayah]
                .filter((v) => isMemorized(v, covered))
                .map((v) => `${riwayah}:${v.surahNumber}:${v.ayahNumber}`),
        ),
    );
    return rows.map((r) => ({
        ...r,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        lastOccurredAt: r.lastOccurredAt.toISOString(),
        reviewer: Boolean(r.reportedById && r.reportedById !== userId),
        memorized: known.has(`${r.riwayah}:${r.surahNumber}:${r.ayahNumber}`),
    }));
}
