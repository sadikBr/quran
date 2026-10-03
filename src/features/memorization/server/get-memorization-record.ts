import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    memorizationAssessment,
    memorizationBaselineChange,
    memorizationRecord,
    userMemorizedHizb,
} from "@/drizzle/schema";
import {
    type Assessment,
    assessmentVerses,
    calculateMemorization,
    isMemorized,
    memorizedAtoms,
    normalizeBaselineRanges,
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
    const [[records, baseline, assessments, changes], catalogue] =
        await Promise.all([
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
                            .from(memorizationBaselineChange)
                            .where(
                                eq(memorizationBaselineChange.userId, userId),
                            )
                            .orderBy(desc(memorizationBaselineChange.createdAt))
                            .limit(10),
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
        record?.baselineRanges ?? [],
    );
    const covered = memorizedAtoms(
        catalogue,
        record?.setupAt ? record.baselineRiwayah : riwayah,
        baselineHizbs,
        assessments,
        record?.baselineRanges ?? [],
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
        baselineHizbs,
        baselineRanges: record?.baselineRanges ?? [],
        baselineSurahCounts: Array.from(
            { length: 114 },
            (_, i) =>
                catalogue[
                    record?.setupAt ? record.baselineRiwayah : riwayah
                ].filter((v) => v.surahNumber === i + 1).length,
        ),
        memorizedAyahs: hizbs.reduce((total, h) => total + h.completed, 0),
        progressHizbs: hizbs.reduce(
            (total, h) => total + (h.total ? h.completed / h.total : 0),
            0,
        ),
        memorizedRanges: normalizeBaselineRanges(
            catalogue[riwayah]
                .filter((v) => isMemorized(v, covered))
                .map((v) => ({
                    surahNumber: v.surahNumber,
                    startAyahNumber: v.ayahNumber,
                    endAyahNumber: v.ayahNumber,
                })),
        ),
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
            previousRanges: item.previousRanges,
            ranges: item.ranges,
            date: item.createdAt.toISOString(),
        })),
    };
}
export type MemorizationRecordView = Awaited<
    ReturnType<typeof getMemorizationRecord>
>;
