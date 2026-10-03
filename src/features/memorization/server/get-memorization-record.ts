import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    memorizationAssessment,
    memorizationBaselineChange,
    memorizationCorrectionRequest,
    memorizationRecord,
    userMemorizedHizb,
} from "@/drizzle/schema";
import {
    type Assessment,
    assessmentVerses,
    CORRECTION_WINDOW_MS,
    calculateMemorization,
    isMemorized,
    memorizedAtoms,
    type Riwayah,
} from "../progress";
import getMemoryCatalogue from "./get-memory-catalogue";

export default async function getMemorizationRecord(
    userId: string,
    riwayah: Riwayah,
    planned: (Omit<Assessment, "id" | "method" | "outcome" | "createdAt"> & {
        scheduledDate: string;
    })[] = [],
) {
    const [
        [records, baseline, assessments, requests, changes, clock],
        catalogue,
    ] = await Promise.all([
        db.transaction(
            (tx) =>
                Promise.all([
                    tx
                        .select()
                        .from(memorizationRecord)
                        .where(eq(memorizationRecord.userId, userId)),
                    tx
                        .select()
                        .from(userMemorizedHizb)
                        .where(eq(userMemorizedHizb.userId, userId))
                        .orderBy(asc(userMemorizedHizb.hizbNumber)),
                    tx
                        .select()
                        .from(memorizationAssessment)
                        .where(eq(memorizationAssessment.userId, userId))
                        .orderBy(
                            asc(memorizationAssessment.createdAt),
                            asc(memorizationAssessment.id),
                        ),
                    tx
                        .select()
                        .from(memorizationCorrectionRequest)
                        .where(eq(memorizationCorrectionRequest.userId, userId))
                        .orderBy(desc(memorizationCorrectionRequest.createdAt))
                        .limit(1),
                    tx
                        .select()
                        .from(memorizationBaselineChange)
                        .where(eq(memorizationBaselineChange.userId, userId))
                        .orderBy(desc(memorizationBaselineChange.createdAt))
                        .limit(10),
                    tx.execute<{ now: Date }>(
                        sql`select clock_timestamp() as now`,
                    ),
                ]),
            { isolationLevel: "repeatable read", accessMode: "read only" },
        ),
        getMemoryCatalogue(),
    ]);
    const record = records[0];
    const baselineHizbs = baseline.map((row) => row.hizbNumber);
    const hizbs = calculateMemorization(
        catalogue,
        riwayah,
        record?.setupAt ? record.baselineRiwayah : riwayah,
        baselineHizbs,
        assessments,
    );
    const covered = memorizedAtoms(
        catalogue,
        record?.setupAt ? record.baselineRiwayah : riwayah,
        baselineHizbs,
        assessments,
    );
    const upcoming = planned.map((range) => ({
        range,
        atoms: new Set(
            assessmentVerses(catalogue, range)
                .filter((v) => !isMemorized(v, covered))
                .flatMap((v) => v.atoms),
        ),
    }));
    const upcomingAtoms = new Set(upcoming.flatMap((p) => [...p.atoms]));
    return {
        revision: record?.revision ?? 0,
        setupAt: record?.setupAt?.toISOString() ?? null,
        baselineRiwayah: record?.setupAt ? record.baselineRiwayah : riwayah,
        correctionUsed: Boolean(record?.correctionUsedAt),
        correctionDeadline: record?.setupAt
            ? new Date(
                  record.setupAt.getTime() + CORRECTION_WINDOW_MS,
              ).toISOString()
            : null,
        serverNow: new Date(clock.rows[0].now).toISOString(),
        baselineHizbs,
        hizbs: hizbs.map((h) => ({
            ...h,
            upcoming: catalogue[riwayah].filter(
                (v) =>
                    v.hizb === h.number &&
                    !isMemorized(v, covered) &&
                    v.atoms.some((a) => upcomingAtoms.has(a)),
            ).length,
            planned: upcoming
                .filter((p) =>
                    catalogue[riwayah].some(
                        (v) =>
                            v.hizb === h.number &&
                            v.atoms.some((a) => p.atoms.has(a)),
                    ),
                )
                .map((p) => p.range),
        })),
        completedHizbs: hizbs
            .filter((hizb) => hizb.total > 0 && hizb.completed === hizb.total)
            .map((hizb) => hizb.number),
        request: requests[0]
            ? {
                  id: requests[0].id,
                  status: requests[0].status,
                  note: requests[0].reviewNote,
                  reason: requests[0].reason,
              }
            : null,
        assessments: assessments.map((item) => ({
            id: item.id,
            method: item.method,
            outcome: item.outcome,
            riwayah: item.riwayah,
            start: `${item.startSurahNumber}:${item.startAyahNumber}`,
            end: `${item.endSurahNumber}:${item.endAyahNumber}`,
            date: item.createdAt.toISOString(),
        })),
        changes: changes.map((item) => ({
            id: item.id,
            source: item.source,
            previous: item.previousHizbs,
            hizbs: item.hizbs,
            date: item.createdAt.toISOString(),
        })),
    };
}
export type MemorizationRecordView = Awaited<
    ReturnType<typeof getMemorizationRecord>
>;
