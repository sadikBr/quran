import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    memorizationAssessment,
    memorizationBaselineChange,
    memorizationRecord,
    practiceAssignment,
    userMemorizedHizb,
} from "@/drizzle/schema";
import { reconcileRevisionPlan } from "@/features/revision/server/reconcile-plan";
import {
    type BaselineRange,
    normalizeBaselineRanges,
    type Riwayah,
    validBaselineRanges,
} from "../progress";
import getMemoryCatalogue from "./get-memory-catalogue";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function lockRecord(tx: Transaction, userId: string) {
    await tx
        .insert(memorizationRecord)
        .values({ userId })
        .onConflictDoNothing();
    const [record] = await tx
        .select()
        .from(memorizationRecord)
        .where(eq(memorizationRecord.userId, userId))
        .for("update");
    return record;
}
async function databaseNow(tx: Transaction) {
    const result = await tx.execute<{ now: Date }>(
        sql`select clock_timestamp() as now`,
    );
    return new Date(result.rows[0].now);
}
export async function saveBaseline(
    userId: string,
    input: {
        hizbs: number[];
        ranges?: BaselineRange[];
        revision: number;
        setup: boolean;
    },
    riwayah: Riwayah,
) {
    const catalogue = input.ranges?.length ? await getMemoryCatalogue() : null;
    return db.transaction(async (tx) => {
        const record = await lockRecord(tx, userId);
        if (
            record.revision !== input.revision ||
            input.setup !== !record.setupAt
        )
            return { success: false as const, reason: "stale" as const };
        const rows = await tx
            .select()
            .from(userMemorizedHizb)
            .where(eq(userMemorizedHizb.userId, userId))
            .orderBy(asc(userMemorizedHizb.hizbNumber));
        const previous = rows.map((row) => row.hizbNumber);
        const hizbs = [...new Set(input.hizbs)].sort((a, b) => a - b);
        // Older open clients do not submit ranges; preserve any already saved passages.
        const ranges = normalizeBaselineRanges(
            input.ranges ?? record.baselineRanges,
        );
        if (
            catalogue &&
            !validBaselineRanges(
                catalogue[record.setupAt ? record.baselineRiwayah : riwayah],
                input.ranges ?? [],
            )
        )
            return { success: false as const, reason: "invalid" as const };
        if (
            !input.setup &&
            JSON.stringify(previous) === JSON.stringify(hizbs) &&
            JSON.stringify(normalizeBaselineRanges(record.baselineRanges)) ===
                JSON.stringify(ranges)
        )
            return { success: true as const, changed: false };
        const now = await databaseNow(tx);
        await tx
            .delete(userMemorizedHizb)
            .where(eq(userMemorizedHizb.userId, userId));
        if (hizbs.length)
            await tx
                .insert(userMemorizedHizb)
                .values(hizbs.map((hizbNumber) => ({ userId, hizbNumber })));
        await tx.insert(memorizationBaselineChange).values({
            id: crypto.randomUUID(),
            userId,
            previousHizbs: previous,
            hizbs,
            previousRanges: record.baselineRanges,
            ranges,
            source: input.setup ? "setup" : "self",
        });
        await tx
            .update(memorizationRecord)
            .set({
                setupAt: input.setup ? now : record.setupAt,
                baselineRiwayah: input.setup ? riwayah : record.baselineRiwayah,
                revision: record.revision + 1,
                baselineRanges: ranges,
            })
            .where(eq(memorizationRecord.userId, userId));
        await reconcileRevisionPlan(tx, userId, now, catalogue ?? undefined);
        return { success: true as const, changed: true };
    });
}
type RangeSnapshot = Pick<
    typeof practiceAssignment.$inferSelect,
    | "id"
    | "assigneeId"
    | "riwayah"
    | "startSurahNumber"
    | "startAyahNumber"
    | "endSurahNumber"
    | "endAyahNumber"
>;
export async function recordAssessment(
    tx: Transaction,
    assignment: RangeSnapshot,
    options: {
        method: "self" | "peer";
        outcome: "confirmed" | "needs_revision";
        reviewerId: string;
        sourceKey: string;
    },
) {
    if (assignment.riwayah !== "hafs" && assignment.riwayah !== "warsh")
        throw new Error("Invalid assessment riwayah.");
    await tx
        .insert(memorizationAssessment)
        .values({
            riwayah: assignment.riwayah,
            startSurahNumber: assignment.startSurahNumber,
            startAyahNumber: assignment.startAyahNumber,
            endSurahNumber: assignment.endSurahNumber,
            endAyahNumber: assignment.endAyahNumber,
            id: crypto.randomUUID(),
            userId: assignment.assigneeId,
            createdAt: sql`clock_timestamp()`,
            assignmentId: assignment.id,
            ...options,
        })
        .onConflictDoNothing({ target: memorizationAssessment.sourceKey });
}

export async function confirmPersonalRange(
    userId: string,
    assignmentId: string,
    expected: Omit<RangeSnapshot, "id" | "assigneeId">,
) {
    return db.transaction(async (tx) => {
        const [assignment] = await tx
            .select()
            .from(practiceAssignment)
            .where(
                and(
                    eq(practiceAssignment.id, assignmentId),
                    eq(practiceAssignment.assigneeId, userId),
                    eq(practiceAssignment.assignedById, userId),
                    sql`${practiceAssignment.groupId} is null`,
                    inArray(practiceAssignment.status, [
                        "in_progress",
                        "needs_revision",
                    ]),
                ),
            )
            .for("update");
        if (
            !assignment ||
            assignment.riwayah !== expected.riwayah ||
            assignment.startSurahNumber !== expected.startSurahNumber ||
            assignment.startAyahNumber !== expected.startAyahNumber ||
            assignment.endSurahNumber !== expected.endSurahNumber ||
            assignment.endAyahNumber !== expected.endAyahNumber ||
            assignment.progressSurahNumber !== assignment.endSurahNumber ||
            assignment.progressAyahNumber !== assignment.endAyahNumber
        )
            return { success: false as const };
        await recordAssessment(tx, assignment, {
            method: "self",
            outcome: "confirmed",
            reviewerId: userId,
            sourceKey: `self:${assignment.id}`,
        });
        await tx
            .update(practiceAssignment)
            .set({
                status: "completed",
                reviewMethod: "self",
                reviewedById: userId,
                reviewedAt: await databaseNow(tx),
                updatedAt: new Date(),
            })
            .where(eq(practiceAssignment.id, assignmentId));
        return { success: true as const };
    });
}
