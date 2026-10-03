import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import type db from "@/drizzle/db";
import {
    memorizationAssessment,
    memorizationRecord,
    revisionPlan,
    revisionSession,
    revisionWeek,
    userMemorizedHizb,
} from "@/drizzle/schema";
import {
    type MemoryCatalogue,
    memorizedAtoms,
} from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import { reconcileRevisionSessions } from "../reconcile";
import type { RevisionSettings } from "../schedule";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Caller holds the member's record lock; the correction and repair commit together. */
export async function reconcileRevisionPlan(
    tx: Tx,
    userId: string,
    now: Date,
    catalogue?: MemoryCatalogue,
) {
    const [plan] = await tx
        .select()
        .from(revisionPlan)
        .where(eq(revisionPlan.userId, userId));
    if (!plan) return false;
    const [week] = await tx
        .select()
        .from(revisionWeek)
        .where(eq(revisionWeek.userId, userId))
        .orderBy(desc(revisionWeek.weekStart))
        .limit(1);
    if (!week) return false;
    const [[record], baseline, assessments, history] = await Promise.all([
        tx
            .select()
            .from(memorizationRecord)
            .where(eq(memorizationRecord.userId, userId)),
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
            .select({ session: revisionSession, week: revisionWeek })
            .from(revisionSession)
            .innerJoin(
                revisionWeek,
                eq(revisionSession.weekId, revisionWeek.id),
            )
            .where(eq(revisionSession.userId, userId))
            .orderBy(asc(revisionSession.ordinal)),
    ]);
    catalogue ??= await getMemoryCatalogue();
    const repair = reconcileRevisionSessions({
        catalogue,
        week: { ...week, reminderTime: null } as RevisionSettings & {
            weekStart: string;
        },
        sessions: history
            .filter((row) => row.week.id === week.id)
            .map((row) => row.session),
        history: history.map(({ session, week }) => ({
            ...session,
            riwayah: week.riwayah,
            weekStart: week.weekStart,
            timezone: week.timezone,
        })),
        covered: memorizedAtoms(
            catalogue,
            record?.setupAt ? record.baselineRiwayah : week.riwayah,
            baseline.map((row) => row.hizbNumber),
            assessments,
            record?.baselineRanges ?? [],
        ),
        assessments,
        now,
    });
    if (!repair.removed.length && !repair.replacements.length) return false;
    if (repair.removed.length)
        await tx
            .delete(revisionSession)
            .where(inArray(revisionSession.id, repair.removed));
    if (repair.replacements.length)
        await tx.insert(revisionSession).values(
            repair.replacements.map((range) => ({
                ...range,
                id: crypto.randomUUID(),
                userId,
                weekId: week.id,
            })),
        );
    await tx
        .update(revisionPlan)
        .set({ revision: sql`${revisionPlan.revision} + 1`, updatedAt: now })
        .where(eq(revisionPlan.userId, userId));
    return true;
}
