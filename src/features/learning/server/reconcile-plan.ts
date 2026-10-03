import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import type db from "@/drizzle/db";
import {
    learningSchedule,
    memorizationAssessment,
    memorizationPlan,
    memorizationRecord,
    memorizationSession,
    memorizationWeek,
    userMemorizedHizb,
} from "@/drizzle/schema";
import {
    assessmentVerses,
    isMemorized,
    type MemoryCatalogue,
    memorizedAtoms,
} from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import { reconcileMemorizationSessions } from "../reconcile";
import { MEMORIZATION_SEQUENCE_VERSION } from "../schedule";
import {
    generateLimitedMemorizationSchedule,
    memorizationUsage,
} from "../weekly-capacity";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The caller holds the member's record lock, including when repairing on read. */
export async function reconcileMemorizationPlan(
    tx: Tx,
    userId: string,
    now: Date,
    catalogue?: MemoryCatalogue,
) {
    const [plan] = await tx
        .select()
        .from(memorizationPlan)
        .where(eq(memorizationPlan.userId, userId));
    if (!plan) return false;
    const [week] = await tx
        .select()
        .from(memorizationWeek)
        .where(eq(memorizationWeek.userId, userId))
        .orderBy(desc(memorizationWeek.weekStart))
        .limit(1);
    if (!week) return false;
    const [record] = await tx
        .select()
        .from(memorizationRecord)
        .where(eq(memorizationRecord.userId, userId));
    if (
        !record?.setupAt ||
        (record.revision === week.baselineRevision &&
            week.sequenceVersion === MEMORIZATION_SEQUENCE_VERSION)
    )
        return false;
    const [baseline, assessments, sessions, [schedule]] = await Promise.all([
        tx
            .select()
            .from(userMemorizedHizb)
            .where(eq(userMemorizedHizb.userId, userId)),
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
            .from(memorizationSession)
            .where(eq(memorizationSession.weekId, week.id))
            .orderBy(asc(memorizationSession.ordinal)),
        tx
            .select()
            .from(learningSchedule)
            .where(eq(learningSchedule.userId, userId)),
    ]);
    catalogue ??= await getMemoryCatalogue();
    const hizbs = baseline.map((row) => row.hizbNumber);
    const initialCovered = memorizedAtoms(
        catalogue,
        record.baselineRiwayah,
        hizbs,
        [],
        record.baselineRanges,
    );
    const covered = memorizedAtoms(
        catalogue,
        record.baselineRiwayah,
        hizbs,
        assessments,
        record.baselineRanges,
    );
    const usage = memorizationUsage(
        catalogue,
        week.riwayah,
        week.timezone,
        initialCovered,
        assessments,
    );
    const today = DateTime.fromJSDate(now, {
        zone: week.timezone,
    }).toISODate() as string;
    // A finished historical batch stays historical. The next read creates a new
    // batch with the member's latest settings instead of reviving an old target.
    const finishedHistory =
        sessions.every(
            (s) =>
                s.completedAt ||
                assessmentVerses(catalogue, {
                    ...s,
                    riwayah: week.riwayah,
                }).every((verse) => isMemorized(verse, covered)),
        ) &&
        today >=
            (DateTime.fromISO(week.weekStart)
                .plus({ weeks: 1 })
                .toISODate() as string);
    if (finishedHistory) {
        await tx
            .update(memorizationWeek)
            .set({
                baselineRevision: record.revision,
                sequenceVersion: MEMORIZATION_SEQUENCE_VERSION,
            })
            .where(eq(memorizationWeek.id, week.id));
        return false;
    }
    const desired = generateLimitedMemorizationSchedule({
        catalogue,
        settings: week,
        // Clearing study days suspends scheduling; keep a repaired queue ready for resumption.
        days: schedule?.memorizationDays.length
            ? schedule.memorizationDays
            : week.days,
        covered,
        fromDate: today > week.weekStart ? today : week.weekStart,
        usage,
    }).sessions;
    const repair = reconcileMemorizationSessions(
        catalogue,
        week.riwayah,
        sessions,
        desired,
    );
    if (repair?.removed.length)
        await tx
            .delete(memorizationSession)
            .where(inArray(memorizationSession.id, repair.removed));
    if (repair?.replacements.length)
        await tx.insert(memorizationSession).values(
            repair.replacements.map((range) => ({
                ...range,
                userId,
                weekId: week.id,
            })),
        );
    await tx
        .update(memorizationWeek)
        .set({
            baselineRevision: record.revision,
            sequenceVersion: MEMORIZATION_SEQUENCE_VERSION,
        })
        .where(eq(memorizationWeek.id, week.id));
    if (repair)
        await tx
            .update(memorizationPlan)
            .set({ revision: sql`${memorizationPlan.revision} + 1` })
            .where(eq(memorizationPlan.userId, userId));
    return Boolean(repair);
}
