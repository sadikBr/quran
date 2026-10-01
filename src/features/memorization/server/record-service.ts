import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    memorizationAssessment,
    memorizationBaselineChange,
    memorizationCorrectionRequest,
    memorizationRecord,
    practiceAssignment,
    user,
    userMemorizedHizb,
} from "@/drizzle/schema";
import { initialCorrectionAvailable, type Riwayah } from "../progress";

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
    input: { hizbs: number[]; revision: number; setup: boolean },
    riwayah: Riwayah,
) {
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
        if (!input.setup && JSON.stringify(previous) === JSON.stringify(hizbs))
            return { success: true as const, changed: false };
        const now = await databaseNow(tx);
        const initial = initialCorrectionAvailable(
            record.setupAt,
            record.correctionUsedAt,
            now,
        );
        const [grant] = await tx
            .select()
            .from(memorizationCorrectionRequest)
            .where(
                and(
                    eq(memorizationCorrectionRequest.userId, userId),
                    eq(memorizationCorrectionRequest.status, "approved"),
                ),
            )
            .for("update");
        if (!input.setup && !initial && !grant)
            return { success: false as const, reason: "locked" as const };
        const source = input.setup ? "setup" : initial ? "initial" : "admin";
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
            source,
            requestId: source === "admin" ? grant.id : null,
        });
        await tx
            .update(memorizationRecord)
            .set({
                setupAt: input.setup ? now : record.setupAt,
                baselineRiwayah: input.setup ? riwayah : record.baselineRiwayah,
                revision: record.revision + 1,
                correctionUsedAt:
                    source === "initial" ? now : record.correctionUsedAt,
            })
            .where(eq(memorizationRecord.userId, userId));
        if (source === "admin")
            await tx
                .update(memorizationCorrectionRequest)
                .set({ status: "used", usedAt: now })
                .where(eq(memorizationCorrectionRequest.id, grant.id));
        return { success: true as const, changed: true };
    });
}
export async function requestCorrection(userId: string, reason: string) {
    return db.transaction(async (tx) => {
        const record = await lockRecord(tx, userId);
        const now = await databaseNow(tx);
        if (
            !record.setupAt ||
            initialCorrectionAvailable(
                record.setupAt,
                record.correctionUsedAt,
                now,
            )
        )
            return { success: false as const };
        const inserted = await tx
            .insert(memorizationCorrectionRequest)
            .values({ id: crypto.randomUUID(), userId, reason })
            .onConflictDoNothing()
            .returning({ id: memorizationCorrectionRequest.id });
        return { success: inserted.length > 0 };
    });
}
export async function reviewCorrection(
    adminId: string,
    requestId: string,
    decision: "approved" | "declined",
    note: string,
) {
    return db.transaction(async (tx) => {
        // Role is checked again in the transaction, not trusted from the client or a stale session.
        const [admin] = await tx
            .select({ role: user.role })
            .from(user)
            .where(eq(user.id, adminId))
            .for("share");
        if (admin?.role !== "admin") return { success: false as const };
        const [request] = await tx
            .select()
            .from(memorizationCorrectionRequest)
            .where(eq(memorizationCorrectionRequest.id, requestId));
        if (!request) return { success: false as const };
        await lockRecord(tx, request.userId);
        const updated = await tx
            .update(memorizationCorrectionRequest)
            .set({
                status: decision,
                reviewNote: note || null,
                reviewerId: adminId,
                reviewedAt: await databaseNow(tx),
            })
            .where(
                and(
                    eq(memorizationCorrectionRequest.id, requestId),
                    eq(memorizationCorrectionRequest.status, "pending"),
                ),
            )
            .returning({ id: memorizationCorrectionRequest.id });
        return { success: updated.length > 0 };
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
