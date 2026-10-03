import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import type db from "@/drizzle/db";
import {
    learningSchedule,
    revisionPlan,
    revisionSession,
    revisionWeek,
} from "@/drizzle/schema";
import { carryForwardSessions } from "@/features/learning/carry-forward";
import type { MemoryCatalogue } from "@/features/memorization/progress";
import {
    type RevisionSettings,
    revisionCoverage,
    weekCalendar,
    weekPeerAtoms,
} from "@/features/revision/schedule";
import { refreshFollowUpSessions } from "../follow-up-plan";
import { retentionState } from "./state";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** Caller holds the learner's record lock. Paused plans and started portions stay intact. */
export async function reconcileFollowUpPlan(
    tx: Tx,
    userId: string,
    now: Date,
    catalogue: MemoryCatalogue,
) {
    const [[plan], [week], [studyDays]] = await Promise.all([
        tx.select().from(revisionPlan).where(eq(revisionPlan.userId, userId)),
        tx
            .select()
            .from(revisionWeek)
            .where(eq(revisionWeek.userId, userId))
            .orderBy(desc(revisionWeek.weekStart))
            .limit(1),
        tx
            .select()
            .from(learningSchedule)
            .where(eq(learningSchedule.userId, userId)),
    ]);
    if (!plan?.enabled || !week || !studyDays?.revisionDays.length) return;
    const state = await retentionState(
        userId,
        catalogue,
        week.timezone,
        now,
        tx,
    );
    const rows = await tx
        .select({ session: revisionSession, week: revisionWeek })
        .from(revisionSession)
        .innerJoin(revisionWeek, eq(revisionSession.weekId, revisionWeek.id))
        .where(eq(revisionSession.userId, userId))
        .orderBy(asc(revisionSession.ordinal));
    // The batch being repaired must not rank itself as prior rotation history.
    // This is especially important when its projected dates cross into a later week.
    const history = rows
        .filter((row) => row.week.id !== week.id)
        .map(({ session, week }) => ({
            ...session,
            riwayah: week.riwayah,
            weekStart: week.weekStart,
            timezone: week.timezone,
        }));
    const saved = rows
        .filter((row) => row.week.id === week.id)
        .map(({ session }) => ({
            ...session,
            done: revisionCoverage(
                catalogue,
                { ...session, riwayah: week.riwayah },
                weekPeerAtoms(
                    catalogue,
                    state.assessments,
                    week.weekStart,
                    week.timezone,
                    now,
                    session.reviewAfter,
                ),
            ).done,
        }));
    const projected = carryForwardSessions(
        saved,
        weekCalendar(now, week.timezone).today,
        studyDays.revisionDays,
        week.timezone,
        week.days,
    );
    const calendar = weekCalendar(now, week.timezone);
    const occupied = new Set(projected.map((s) => s.scheduledDate));
    const additionalDays =
        week.weekStart >= calendar.weekStart
            ? Array.from({ length: 7 }, (_, i) =>
                  DateTime.fromISO(week.weekStart, {
                      zone: week.timezone,
                  }).plus({ days: i }),
              )
                  .filter(
                      (day) =>
                          studyDays.revisionDays.includes(day.weekday) &&
                          (day.toISODate() as string) >= calendar.today &&
                          !occupied.has(day.toISODate()),
                  )
                  .map((day) => day.toISODate() as string)
            : [];
    const repair = refreshFollowUpSessions({
        catalogue,
        settings: { ...week, reminderTime: null } as RevisionSettings,
        sessions: saved.map((s) => ({
            ...s,
            projectedDate:
                projected.find((p) => p.id === s.id)?.scheduledDate ?? null,
        })),
        covered: state.covered,
        assessments: state.assessments,
        history,
        followUps: state.followUps,
        additionalDays,
    });
    if (!repair.removed.length && !repair.replacements.length) return;
    if (repair.removed.length)
        await tx
            .delete(revisionSession)
            .where(inArray(revisionSession.id, repair.removed));
    if (repair.replacements.length)
        await tx.insert(revisionSession).values(
            repair.replacements.map((s) => ({
                ...s,
                id: crypto.randomUUID(),
                userId,
                weekId: week.id,
            })),
        );
    await tx
        .update(revisionPlan)
        .set({ revision: sql`${revisionPlan.revision} + 1`, updatedAt: now })
        .where(eq(revisionPlan.userId, userId));
}
