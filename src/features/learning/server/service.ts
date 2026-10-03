import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import db from "@/drizzle/db";
import {
    learningSchedule,
    memorizationAssessment,
    memorizationPlan,
    memorizationRecord,
    memorizationSession,
    memorizationWeek,
    revisionPlan,
    userMemorizedHizb,
} from "@/drizzle/schema";
import {
    assessmentVerses,
    type MemoryCatalogue,
    type Riwayah,
} from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import {
    lockRecord,
    recordAssessment,
} from "@/features/memorization/server/record-service";
import {
    type ScheduledRange,
    weekBounds,
    weekCalendar,
} from "@/features/revision/schedule";
import {
    carryForwardSessions,
    isActivePlanSession,
    nextPlanStart,
} from "../carry-forward";
import {
    isMemorized,
    type LearningSchedule,
    type MemorizationSettings,
    memorizedAtoms,
} from "../schedule";
import {
    generateLimitedMemorizationSchedule,
    memorizationCapacity,
    memorizationUsage,
    quartersForAtoms,
} from "../weekly-capacity";

import { clearPlanSchedule, planVersion } from "./plan-lifecycle";
import { reconcileMemorizationPlan } from "./reconcile-plan";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function getLearningSchedule(userId: string) {
    const [row] = await db
        .select()
        .from(learningSchedule)
        .where(eq(learningSchedule.userId, userId));
    return row
        ? {
              revisionDays: row.revisionDays,
              memorizationDays: row.memorizationDays,
              revision: row.revision,
          }
        : { revisionDays: [], memorizationDays: [], revision: 0 };
}
export async function saveLearningSchedule(
    userId: string,
    input: LearningSchedule,
) {
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const [old] = await tx
            .select()
            .from(learningSchedule)
            .where(eq(learningSchedule.userId, userId));
        if ((old?.revision ?? 0) !== input.revision)
            return { success: false as const, reason: "stale" };
        const value = {
            revisionDays: input.revisionDays,
            memorizationDays: input.memorizationDays,
            revision: input.revision + 1,
        };
        await tx
            .insert(learningSchedule)
            .values({ userId, ...value })
            .onConflictDoUpdate({
                target: learningSchedule.userId,
                set: value,
            });
        // Saved study days drive pending dates; historical snapshots keep the original allocation.
        if (
            (old?.revisionDays ?? []).join(",") !== input.revisionDays.join(",")
        )
            await tx
                .update(revisionPlan)
                .set({
                    days: input.revisionDays,
                    revision: sql`${revisionPlan.revision} + 1`,
                    updatedAt: sql`clock_timestamp()`,
                })
                .where(eq(revisionPlan.userId, userId));
        return { success: true as const };
    });
}
async function clock(tx: Tx) {
    const r = await tx.execute<{ now: Date }>(
        sql`select clock_timestamp() as now`,
    );
    return new Date(r.rows[0].now);
}
async function memory(
    tx: Tx,
    userId: string,
    catalogue: MemoryCatalogue,
    riwayah: Riwayah,
) {
    const [[record], baseline, assessments] = await Promise.all([
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
    ]);
    return {
        record,
        assessments,
        initialCovered: memorizedAtoms(
            catalogue,
            record?.setupAt ? record.baselineRiwayah : riwayah,
            baseline.map((r) => r.hizbNumber),
            [],
            record?.baselineRanges ?? [],
        ),
        covered: memorizedAtoms(
            catalogue,
            record?.setupAt ? record.baselineRiwayah : riwayah,
            baseline.map((r) => r.hizbNumber),
            assessments,
            record?.baselineRanges ?? [],
        ),
    };
}
async function currentWeek(
    tx: Tx,
    userId: string,
    now: Date,
    timezone: string,
) {
    const weeks = await tx
        .select()
        .from(memorizationWeek)
        .where(eq(memorizationWeek.userId, userId))
        .orderBy(desc(memorizationWeek.weekStart))
        .limit(3);
    const current =
        weeks.find((w) => {
            const b = weekBounds(w.weekStart, w.timezone);
            return +now >= b.start && +now < b.end;
        }) ??
        weeks.find(
            (w) => w.weekStart === weekCalendar(now, timezone).weekStart,
        );
    if (current) return current;
    const latest = weeks[0];
    if (latest && +now < weekBounds(latest.weekStart, latest.timezone).start)
        return latest;
    if (latest && +now >= weekBounds(latest.weekStart, latest.timezone).end) {
        const catalogue = await getMemoryCatalogue();
        const state = await memory(tx, userId, catalogue, latest.riwayah);
        const sessions = await readSessions(tx, latest.id);
        if (
            sessionViews(
                sessions,
                state.covered,
                catalogue,
                latest.riwayah,
            ).some((s) => !s.done)
        )
            return latest;
    }
    return undefined;
}
async function readSessions(tx: Tx, weekId: string) {
    return tx
        .select()
        .from(memorizationSession)
        .where(eq(memorizationSession.weekId, weekId))
        .orderBy(asc(memorizationSession.ordinal));
}
function sessionViews(
    sessions: (typeof memorizationSession.$inferSelect)[],
    covered: Set<string>,
    catalogue: MemoryCatalogue,
    riwayah: Riwayah,
) {
    return sessions.map((s) => {
        const verses = assessmentVerses(catalogue, { ...s, riwayah });
        const remaining = verses.filter((v) => !isMemorized(v, covered));
        return {
            ...s,
            completedAt: s.completedAt?.toISOString() ?? null,
            total: verses.length,
            completed: verses.length - remaining.length,
            remaining: remaining.map((v) => `${v.surahNumber}:${v.ayahNumber}`),
            done: remaining.length === 0,
        };
    });
}
function projectSessions(
    sessions: (typeof memorizationSession.$inferSelect)[],
    state: Awaited<ReturnType<typeof memory>>,
    catalogue: MemoryCatalogue,
    week: typeof memorizationWeek.$inferSelect,
    today: string,
    days: number[],
) {
    return carryForwardSessions(
        sessionViews(sessions, state.covered, catalogue, week.riwayah),
        today,
        days,
        week.timezone,
        week.days,
        memorizationCapacity(
            memorizationUsage(
                catalogue,
                week.riwayah,
                week.timezone,
                state.initialCovered,
                state.assessments,
            ),
            catalogue[week.riwayah],
            week.timezone,
            week.quartersPerWeek,
        ),
    );
}
async function newScheduleFromDate(
    tx: Tx,
    userId: string,
    today: string,
    timezone: string,
) {
    const [last] = await tx
        .select({ completedAt: memorizationAssessment.createdAt })
        .from(memorizationAssessment)
        .where(
            and(
                eq(memorizationAssessment.userId, userId),
                like(memorizationAssessment.sourceKey, "memorization-weekly:%"),
            ),
        )
        .orderBy(desc(memorizationAssessment.createdAt))
        .limit(1);
    return last?.completedAt &&
        weekCalendar(last.completedAt, timezone).today === today
        ? (DateTime.fromISO(today).plus({ days: 1 }).toISODate() as string)
        : today;
}
async function makePreview(
    tx: Tx,
    userId: string,
    settings: MemorizationSettings,
    catalogue: MemoryCatalogue,
    regenerate = false,
) {
    const [plan] = await tx
        .select()
        .from(memorizationPlan)
        .where(eq(memorizationPlan.userId, userId));
    const [schedule] = await tx
        .select()
        .from(learningSchedule)
        .where(eq(learningSchedule.userId, userId));
    const now = await clock(tx);
    const current = await currentWeek(
        tx,
        userId,
        now,
        plan?.timezone ?? settings.timezone,
    );
    const calendar = weekCalendar(now, settings.timezone);
    const state = await memory(tx, userId, catalogue, settings.riwayah);
    const days = schedule?.memorizationDays ?? [];
    const currentSessions = current ? await readSessions(tx, current.id) : [];
    const projected =
        current && !regenerate
            ? projectSessions(
                  currentSessions,
                  state,
                  catalogue,
                  current,
                  weekCalendar(now, current.timezone).today,
                  days,
              )
            : [];
    const fromDate =
        current && !regenerate
            ? ([
                  calendar.today,
                  nextPlanStart(current.weekStart, projected, current.timezone),
              ]
                  .sort()
                  .at(-1) as string)
            : await newScheduleFromDate(
                  tx,
                  userId,
                  calendar.today,
                  settings.timezone,
              );
    const usage = memorizationUsage(
        catalogue,
        settings.riwayah,
        settings.timezone,
        state.initialCovered,
        state.assessments,
    );
    // This preview starts after the current queue is finished; planning does not grant credit.
    const previewCovered = new Set(state.covered);
    if (current && !regenerate)
        for (const session of currentSessions)
            for (const verse of assessmentVerses(catalogue, {
                ...session,
                riwayah: current.riwayah,
            }))
                for (const atom of verse.atoms) previewCovered.add(atom);
    // The next-batch preview assumes the current portions will be finished on
    // their projected dates. Reserve those quarters as well as actual credit.
    if (current && !regenerate) {
        const byReference = new Map(
            catalogue[current.riwayah].map((v) => [
                `${v.surahNumber}:${v.ayahNumber}`,
                v,
            ]),
        );
        for (const session of projected) {
            if (session.done || !session.scheduledDate) continue;
            const weekStart = DateTime.fromISO(session.scheduledDate, {
                zone: settings.timezone,
            })
                .startOf("week")
                .toISODate() as string;
            const quarters = usage.get(weekStart) ?? new Set<number>();
            const atoms = new Set(
                session.remaining.flatMap(
                    (reference) => byReference.get(reference)?.atoms ?? [],
                ),
            );
            for (const quarter of quartersForAtoms(
                catalogue[settings.riwayah],
                atoms,
            ))
                quarters.add(quarter);
            usage.set(weekStart, quarters);
        }
    }
    const { sessions, weekStart } = generateLimitedMemorizationSchedule({
        catalogue,
        settings,
        days,
        covered: previewCovered,
        fromDate,
        usage,
    });
    const key = createHash("sha256")
        .update(
            JSON.stringify({
                settings,
                regenerate,
                version: await planVersion(tx, userId, "memorization"),
                planRevision: plan?.revision ?? 0,
                schedule,
                setup: state.record?.revision,
                sessions,
                weekStart,
                today: calendar.today,
            }),
        )
        .digest("hex");
    return {
        key,
        weekStart,
        days,
        sessions,
        regenerate,
        nextWeek: Boolean(current) && !regenerate,
        ready:
            Boolean(state.record?.setupAt) &&
            days.length > 0 &&
            (!regenerate || Boolean(plan)),
        revision: plan?.revision ?? 0,
    };
}
async function insertWeek(
    tx: Tx,
    userId: string,
    settings: MemorizationSettings,
    weekStart: string,
    days: number[],
    sessions: ScheduledRange[],
) {
    const id = crypto.randomUUID();
    const [record] = await tx
        .select()
        .from(memorizationRecord)
        .where(eq(memorizationRecord.userId, userId));
    await tx.insert(memorizationWeek).values({
        id,
        userId,
        weekStart,
        timezone: settings.timezone,
        riwayah: settings.riwayah,
        days,
        quartersPerWeek: settings.quartersPerWeek,
        direction: settings.direction,
        baselineRevision: record?.revision ?? 0,
    });
    if (sessions.length)
        await tx.insert(memorizationSession).values(
            sessions.map((s) => ({
                ...s,
                id: crypto.randomUUID(),
                userId,
                weekId: id,
            })),
        );
}
export async function previewMemorizationPlan(
    userId: string,
    settings: MemorizationSettings,
    regenerate = false,
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(
        (tx) => makePreview(tx, userId, settings, catalogue, regenerate),
        { isolationLevel: "repeatable read", accessMode: "read only" },
    );
}
export async function saveMemorizationPlan(
    userId: string,
    settings: MemorizationSettings,
    expectedKey: string,
    regenerate = false,
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const preview = await makePreview(
            tx,
            userId,
            settings,
            catalogue,
            regenerate,
        );
        if (preview.key !== expectedKey)
            return { success: false as const, reason: "stale" };
        if (!preview.ready || (regenerate && !preview.sessions.length))
            return { success: false as const, reason: "invalid" };
        const [existing] = await tx
            .select()
            .from(memorizationPlan)
            .where(eq(memorizationPlan.userId, userId));
        if (regenerate) await clearPlanSchedule(tx, userId, "memorization");
        const values = {
            ...settings,
            enabled: regenerate ? existing.enabled : true,
            revision: preview.revision + 1,
        };
        await tx
            .insert(memorizationPlan)
            .values({ userId, ...values })
            .onConflictDoUpdate({
                target: memorizationPlan.userId,
                set: values,
            });
        if (!preview.nextWeek)
            await insertWeek(
                tx,
                userId,
                settings,
                preview.weekStart,
                preview.days,
                preview.sessions,
            );
        return { success: true as const };
    });
}
export async function deleteMemorizationPlan(
    userId: string,
    expectedVersion: string,
) {
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        if ((await planVersion(tx, userId, "memorization")) !== expectedVersion)
            return { success: false as const, reason: "stale" };
        const deleted = await tx
            .delete(memorizationPlan)
            .where(eq(memorizationPlan.userId, userId))
            .returning();
        if (!deleted.length)
            return { success: false as const, reason: "stale" };
        await clearPlanSchedule(tx, userId, "memorization");
        return { success: true as const };
    });
}
export async function pauseMemorizationPlan(userId: string, revision: number) {
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const rows = await tx
            .update(memorizationPlan)
            .set({ enabled: false, revision: revision + 1 })
            .where(
                and(
                    eq(memorizationPlan.userId, userId),
                    eq(memorizationPlan.revision, revision),
                ),
            )
            .returning();
        return { success: rows.length > 0 };
    });
}
export async function getMemorizationPlanView(
    userId: string,
    riwayah: Riwayah,
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        await reconcileMemorizationPlan(tx, userId, await clock(tx), catalogue);
        const [plan] = await tx
            .select()
            .from(memorizationPlan)
            .where(eq(memorizationPlan.userId, userId));
        const [schedule] = await tx
            .select()
            .from(learningSchedule)
            .where(eq(learningSchedule.userId, userId));
        const now = await clock(tx);
        let week = await currentWeek(
            tx,
            userId,
            now,
            plan?.timezone ?? "Africa/Casablanca",
        );
        const state = await memory(
            tx,
            userId,
            catalogue,
            week?.riwayah ?? plan?.riwayah ?? riwayah,
        );
        if (
            plan?.enabled &&
            !week &&
            state.record?.setupAt &&
            schedule?.memorizationDays.length
        ) {
            const { sessions, weekStart } = generateLimitedMemorizationSchedule(
                {
                    catalogue,
                    settings: plan,
                    days: schedule.memorizationDays,
                    covered: state.covered,
                    fromDate: await newScheduleFromDate(
                        tx,
                        userId,
                        weekCalendar(now, plan.timezone).today,
                        plan.timezone,
                    ),
                    usage: memorizationUsage(
                        catalogue,
                        plan.riwayah,
                        plan.timezone,
                        state.initialCovered,
                        state.assessments,
                    ),
                },
            );
            await insertWeek(
                tx,
                userId,
                plan,
                weekStart,
                schedule.memorizationDays,
                sessions,
            );
            week = await currentWeek(tx, userId, now, plan.timezone);
        }
        const sessions = week ? await readSessions(tx, week.id) : [];
        const today = weekCalendar(
            now,
            week?.timezone ?? plan?.timezone ?? "Africa/Casablanca",
        ).today;
        const items = week
            ? projectSessions(
                  sessions,
                  state,
                  catalogue,
                  week,
                  today,
                  schedule?.memorizationDays ?? [],
              )
            : [];
        return {
            version: await planVersion(tx, userId, "memorization"),
            plan: plan ?? null,
            week: week ?? null,
            setup: Boolean(state.record?.setupAt),
            today,
            sessions: items.map((item) => ({
                ...item,
                active: isActivePlanSession(
                    item,
                    today,
                    Boolean(plan?.enabled),
                ),
            })),
        };
    });
}
export async function finishMemorizationSession(
    userId: string,
    sessionId: string,
) {
    return updateMemorizationSession(userId, sessionId, { confirm: true });
}
export async function saveMemorizationProgress(
    userId: string,
    sessionId: string,
    reference: { surahNumber: number; ayahNumber: number },
) {
    return updateMemorizationSession(userId, sessionId, reference);
}
async function updateMemorizationSession(
    userId: string,
    sessionId: string,
    change: { surahNumber: number; ayahNumber: number } | { confirm: true },
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        await reconcileMemorizationPlan(tx, userId, await clock(tx), catalogue);
        const [plan] = await tx
            .select()
            .from(memorizationPlan)
            .where(eq(memorizationPlan.userId, userId));
        const [row] = await tx
            .select({ session: memorizationSession, week: memorizationWeek })
            .from(memorizationSession)
            .innerJoin(
                memorizationWeek,
                eq(memorizationSession.weekId, memorizationWeek.id),
            )
            .where(
                and(
                    eq(memorizationSession.id, sessionId),
                    eq(memorizationSession.userId, userId),
                ),
            )
            .for("update", { of: memorizationSession });
        if (!plan?.enabled || !row)
            return { success: false as const, reason: "inactive" as const };
        const { session, week } = row;
        const now = await clock(tx);
        const active = await currentWeek(tx, userId, now, plan.timezone);
        if (active?.id !== week.id)
            return { success: false as const, reason: "inactive" as const };
        const today = weekCalendar(now, week.timezone).today;
        if (session.completedAt)
            return {
                success:
                    "confirm" in change &&
                    weekCalendar(session.completedAt, week.timezone).today ===
                        today,
                completed: true,
            };
        const state = await memory(tx, userId, catalogue, week.riwayah);
        if (!state.record?.setupAt) return { success: false as const };
        const [schedule] = await tx
            .select()
            .from(learningSchedule)
            .where(eq(learningSchedule.userId, userId));
        const projected = projectSessions(
            await readSessions(tx, week.id),
            state,
            catalogue,
            week,
            today,
            schedule?.memorizationDays ?? [],
        ).find((item) => item.id === sessionId);
        if (!projected || !isActivePlanSession(projected, today, plan.enabled))
            return { success: false as const, reason: "inactive" as const };
        const verses = assessmentVerses(catalogue, {
            ...session,
            riwayah: week.riwayah,
        });
        const remaining = verses.filter((v) => !isMemorized(v, state.covered));
        const last = remaining.at(-1);
        if (!last) return { success: true as const, completed: true };
        if ("surahNumber" in change) {
            if (
                !verses.some(
                    (v) =>
                        v.surahNumber === change.surahNumber &&
                        v.ayahNumber === change.ayahNumber,
                )
            )
                return { success: false as const };
            await tx
                .update(memorizationSession)
                .set({
                    progressSurahNumber: change.surahNumber,
                    progressAyahNumber: change.ayahNumber,
                })
                .where(eq(memorizationSession.id, sessionId));
            // Saving a position never credits memorization; confirmation remains explicit.
            return {
                success: true as const,
                completed:
                    change.surahNumber * 1000 + change.ayahNumber >=
                    last.surahNumber * 1000 + last.ayahNumber,
            };
        }
        if (
            !session.progressSurahNumber ||
            !session.progressAyahNumber ||
            session.progressSurahNumber * 1000 + session.progressAyahNumber <
                last.surahNumber * 1000 + last.ayahNumber
        )
            return { success: false as const };
        const segments: (typeof verses)[] = [];
        let previous = -2;
        for (const [i, v] of verses.entries()) {
            if (isMemorized(v, state.covered)) continue;
            if (i === previous + 1) segments.at(-1)?.push(v);
            else segments.push([v]);
            previous = i;
        }
        for (const [i, segment] of segments.entries()) {
            const first = segment[0],
                last = segment[segment.length - 1];
            await recordAssessment(
                tx,
                {
                    id: session.id,
                    assigneeId: userId,
                    riwayah: week.riwayah,
                    startSurahNumber: first.surahNumber,
                    startAyahNumber: first.ayahNumber,
                    endSurahNumber: last.surahNumber,
                    endAyahNumber: last.ayahNumber,
                },
                {
                    method: "self",
                    outcome: "confirmed",
                    reviewerId: userId,
                    sourceKey: `memorization-weekly:${session.id}:${i}`,
                },
            );
        }
        await tx
            .update(memorizationSession)
            .set({ completedAt: now })
            .where(eq(memorizationSession.id, session.id));
        return { success: true as const };
    });
}
export type MemorizationPlanView = Awaited<
    ReturnType<typeof getMemorizationPlanView>
>;
export type MemorizationPreview = Awaited<
    ReturnType<typeof previewMemorizationPlan>
>;
