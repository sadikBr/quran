import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import db from "@/drizzle/db";
import {
    learningSchedule,
    memorizationAssessment,
    memorizationRecord,
    revisionPlan,
    revisionSession,
    revisionWeek,
    userMemorizedHizb,
} from "@/drizzle/schema";
import {
    carryForwardSessions,
    isActivePlanSession,
    nextPlanStart,
} from "@/features/learning/carry-forward";
import {
    clearPlanSchedule,
    planVersion,
    regenerationCalendar,
} from "@/features/learning/server/plan-lifecycle";
import {
    assessmentVerses,
    calculateMemorization,
    isMemorized,
    type MemoryCatalogue,
    memorizedAtoms,
    type Riwayah,
} from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import {
    lockRecord,
    recordAssessment,
} from "@/features/memorization/server/record-service";
import { buildRevisionRotation } from "../rotation";
import {
    dueRevisionDate,
    generateRevisionSchedule,
    type RevisionSettings,
    revisionCoverage,
    type ScheduledRange,
    verseKey,
    weekBounds,
    weekCalendar,
    weekPeerAtoms,
} from "../schedule";
import { reconcileRevisionPlan } from "./reconcile-plan";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function clock(tx: Tx) {
    const result = await tx.execute<{ now: Date }>(
        sql`select clock_timestamp() as now`,
    );
    return new Date(result.rows[0].now);
}
async function memory(
    tx: Pick<Tx, "select">,
    userId: string,
    riwayah: Riwayah,
    catalogue: MemoryCatalogue,
) {
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
            .where(eq(revisionSession.userId, userId)),
    ]);
    const complete = calculateMemorization(
        catalogue,
        riwayah,
        record?.setupAt ? record.baselineRiwayah : riwayah,
        baseline.map((r) => r.hizbNumber),
        assessments,
        record?.baselineRanges ?? [],
    )
        .filter((h) => h.total > 0 && h.percent === 100)
        .map((h) => h.number);
    const covered = memorizedAtoms(
        catalogue,
        record?.setupAt ? record.baselineRiwayah : riwayah,
        baseline.map((r) => r.hizbNumber),
        assessments,
        record?.baselineRanges ?? [],
    );
    return {
        record,
        complete,
        covered,
        memorizedAyahs: catalogue[riwayah].filter((v) =>
            isMemorized(v, covered),
        ).length,
        assessments,
        history: history.map(({ session, week }) => ({
            ...session,
            riwayah: week.riwayah,
            weekStart: week.weekStart,
            timezone: week.timezone,
        })),
    };
}
function sessionViews(
    state: Awaited<ReturnType<typeof memory>>,
    week: typeof revisionWeek.$inferSelect,
    catalogue: MemoryCatalogue,
    now: Date,
) {
    const peer = weekPeerAtoms(
        catalogue,
        state.assessments,
        week.weekStart,
        week.timezone,
        now,
    );
    return state.history
        .filter((session) => session.weekId === week.id)
        .map((session) => {
            const coverage = revisionCoverage(catalogue, session, peer);
            return {
                ...session,
                completedAt: session.completedAt?.toISOString() ?? null,
                total: coverage.total,
                peer: coverage.peer,
                done: coverage.done,
                available: assessmentVerses(catalogue, session).every((v) =>
                    isMemorized(v, state.covered),
                ),
                remaining: coverage.remaining.map(verseKey),
            };
        });
}
function newScheduleFromDate(
    state: Awaited<ReturnType<typeof memory>>,
    today: string,
    timezone: string,
) {
    return state.history.some(
        (session) =>
            session.completedAt &&
            weekCalendar(session.completedAt, timezone).today === today,
    ) ||
        state.assessments.some(
            (a) =>
                a.sourceKey?.startsWith("weekly:") &&
                weekCalendar(a.createdAt, timezone).today === today,
        )
        ? (DateTime.fromISO(today).plus({ days: 1 }).toISODate() as string)
        : today;
}
async function insertWeek(
    tx: Tx,
    userId: string,
    settings: RevisionSettings,
    weekStart: string,
    schedule: ScheduledRange[],
) {
    const id = crypto.randomUUID();
    await tx.insert(revisionWeek).values({
        id,
        userId,
        weekStart,
        timezone: settings.timezone,
        riwayah: settings.riwayah,
        days: settings.days,
        quartersPerDay: settings.quartersPerDay,
    });
    if (schedule.length)
        await tx.insert(revisionSession).values(
            schedule.map((range) => ({
                ...range,
                id: crypto.randomUUID(),
                weekId: id,
                userId,
            })),
        );
}
async function sharedSettings(
    tx: Pick<Tx, "select">,
    userId: string,
    settings: RevisionSettings,
) {
    const [studyDays] = await tx
        .select()
        .from(learningSchedule)
        .where(eq(learningSchedule.userId, userId));
    return { ...settings, days: studyDays?.revisionDays ?? [] };
}
async function makePreview(
    tx: Tx,
    userId: string,
    settings: RevisionSettings,
    catalogue: MemoryCatalogue,
    regenerate = false,
) {
    settings = await sharedSettings(tx, userId, settings);
    const [plan] = await tx
        .select()
        .from(revisionPlan)
        .where(eq(revisionPlan.userId, userId));
    const now = await clock(tx);
    // A saved week retains its own timezone and reading, even when preferences change.
    const current = await currentWeek(
        tx,
        userId,
        now,
        plan?.timezone ?? settings.timezone,
    );
    const calendar = weekCalendar(now, settings.timezone);
    const state = await memory(tx, userId, settings.riwayah, catalogue);
    const currentState =
        current && current.riwayah !== settings.riwayah
            ? await memory(tx, userId, current.riwayah, catalogue)
            : state;
    let fromDate =
        current && !regenerate
            ? nextPlanStart(
                  current.weekStart,
                  carryForwardSessions(
                      sessionViews(currentState, current, catalogue, now),
                      weekCalendar(now, current.timezone).today,
                      settings.days,
                      current.timezone,
                      current.days,
                  ),
                  current.timezone,
              )
            : newScheduleFromDate(state, calendar.today, settings.timezone);
    let weekStart =
        current && !regenerate
            ? (DateTime.fromISO(fromDate, { zone: settings.timezone })
                  .startOf("week")
                  .toISODate() as string)
            : calendar.weekStart;
    if (regenerate || !current)
        ({ fromDate, weekStart } = regenerationCalendar(
            fromDate,
            settings.days,
            settings.timezone,
        ));
    const reviewed = new Set<string>();
    if (regenerate)
        for (const assessment of state.assessments) {
            if (
                +assessment.createdAt <
                    weekBounds(weekStart, settings.timezone).start ||
                +assessment.createdAt > +now
            )
                continue;
            if (
                !(
                    assessment.sourceKey?.startsWith("weekly:") ||
                    (assessment.method === "peer" &&
                        assessment.outcome === "confirmed")
                )
            )
                continue;
            for (const verse of assessmentVerses(catalogue, assessment))
                for (const atom of verse.atoms) reviewed.add(atom);
        }
    const sessions = generateRevisionSchedule({
        reviewed,
        catalogue,
        settings,
        completedHizbs: state.complete,
        covered: state.covered,
        assessments: state.assessments,
        history: state.history,
        weekStart,
        fromDate,
    });
    const revision = plan?.revision ?? 0;
    const key = createHash("sha256")
        .update(
            JSON.stringify({
                settings,
                regenerate,
                version: await planVersion(tx, userId, "revision"),
                revision,
                setup: state.record?.revision,
                complete: state.complete,
                sessions,
                weekStart,
                date: calendar.today,
            }),
        )
        .digest("hex");
    return {
        key,
        revision,
        weekStart,
        sessions,
        completedHizbs: state.complete.length,
        memorizedAyahs: state.memorizedAyahs,
        ready:
            Boolean(state.record?.setupAt) &&
            state.memorizedAyahs > 0 &&
            settings.days.length > 0 &&
            (!regenerate || Boolean(plan)),
        regenerate,
        nextWeek: Boolean(current) && !regenerate,
    };
}
async function currentWeek(
    tx: Pick<Tx, "select">,
    userId: string,
    now: Date,
    timezone: string,
) {
    // Check the week snapshot first, so a timezone change cannot produce a second active week.
    const weeks = await tx
        .select()
        .from(revisionWeek)
        .where(eq(revisionWeek.userId, userId))
        .orderBy(desc(revisionWeek.weekStart))
        .limit(3);
    const current =
        weeks.find((week) => {
            const b = weekBounds(week.weekStart, week.timezone);
            return +now >= b.start && +now < b.end;
        }) ??
        weeks.find(
            (week) => week.weekStart === weekCalendar(now, timezone).weekStart,
        );
    if (current) return current;
    // Keep the latest unfinished batch across calendar weeks, with the same IDs and reading.
    // Older superseded snapshots are history, not an additional backlog.
    const latest = weeks[0];
    if (latest && +now < weekBounds(latest.weekStart, latest.timezone).start)
        return latest;
    if (latest && +now >= weekBounds(latest.weekStart, latest.timezone).end) {
        const catalogue = await getMemoryCatalogue();
        const state = await memory(tx, userId, latest.riwayah, catalogue);
        if (
            sessionViews(state, latest, catalogue, now).some(
                (s) => s.available && !s.done,
            )
        )
            return latest;
    }
    return undefined;
}
export async function getRevisionReminderDate(
    userId: string,
    timezone: string,
    time: string,
    now: Date,
) {
    const week = await currentWeek(db, userId, now, timezone);
    return dueRevisionDate(time, week?.timezone ?? timezone, now);
}
export async function previewRevisionPlan(
    userId: string,
    settings: RevisionSettings,
    regenerate = false,
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(
        (tx) => makePreview(tx, userId, settings, catalogue, regenerate),
        { isolationLevel: "repeatable read", accessMode: "read only" },
    );
}
export async function saveRevisionPlan(
    userId: string,
    settings: RevisionSettings,
    expectedKey: string,
    regenerate = false,
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        settings = await sharedSettings(tx, userId, settings);
        const preview = await makePreview(
            tx,
            userId,
            settings,
            catalogue,
            regenerate,
        );
        if (preview.key !== expectedKey)
            return { success: false as const, reason: "stale" as const };
        if (!preview.ready || (regenerate && !preview.sessions.length))
            return { success: false as const, reason: "empty" as const };
        const [existing] = await tx
            .select()
            .from(revisionPlan)
            .where(eq(revisionPlan.userId, userId));
        if (regenerate) await clearPlanSchedule(tx, userId, "revision");
        const enabled = regenerate ? existing.enabled : true;
        await tx
            .insert(revisionPlan)
            .values({ ...settings, userId, enabled, revision: 1 })
            .onConflictDoUpdate({
                target: revisionPlan.userId,
                set: {
                    ...settings,
                    enabled,
                    revision: preview.revision + 1,
                    updatedAt: await clock(tx),
                },
            });
        if (!preview.nextWeek)
            await insertWeek(
                tx,
                userId,
                settings,
                preview.weekStart,
                preview.sessions,
            );
        return { success: true as const };
    });
}
export async function deleteRevisionPlan(
    userId: string,
    expectedVersion: string,
) {
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        if ((await planVersion(tx, userId, "revision")) !== expectedVersion)
            return { success: false as const, reason: "stale" };
        const deleted = await tx
            .delete(revisionPlan)
            .where(eq(revisionPlan.userId, userId))
            .returning();
        if (!deleted.length)
            return { success: false as const, reason: "stale" };
        await clearPlanSchedule(tx, userId, "revision");
        return { success: true as const };
    });
}
export async function pauseRevisionPlan(userId: string, revision: number) {
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const updated = await tx
            .update(revisionPlan)
            .set({
                enabled: false,
                revision: revision + 1,
                updatedAt: await clock(tx),
            })
            .where(
                and(
                    eq(revisionPlan.userId, userId),
                    eq(revisionPlan.revision, revision),
                ),
            )
            .returning();
        return { success: updated.length > 0 };
    });
}
export async function getRevisionView(
    userId: string,
    preferredRiwayah: Riwayah = "hafs",
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const now = await clock(tx);
        // Repair older saved batches too, before rendering or opening their readers.
        await reconcileRevisionPlan(tx, userId, now, catalogue);
        const [plan] = await tx
            .select()
            .from(revisionPlan)
            .where(eq(revisionPlan.userId, userId));
        let week = await currentWeek(
            tx,
            userId,
            now,
            plan?.timezone ?? "Africa/Casablanca",
        );
        let state = await memory(
            tx,
            userId,
            week?.riwayah ?? plan?.riwayah ?? preferredRiwayah,
            catalogue,
        );
        const [studyDays] = await tx
            .select()
            .from(learningSchedule)
            .where(eq(learningSchedule.userId, userId));
        if (plan?.enabled && !week && studyDays?.revisionDays.length) {
            const calendar = regenerationCalendar(
                newScheduleFromDate(
                    state,
                    weekCalendar(now, plan.timezone).today,
                    plan.timezone,
                ),
                studyDays.revisionDays,
                plan.timezone,
            );
            const schedule = state.record?.setupAt
                ? generateRevisionSchedule({
                      catalogue,
                      settings: {
                          ...plan,
                          days: studyDays.revisionDays,
                      } as RevisionSettings,
                      completedHizbs: state.complete,
                      covered: state.covered,
                      assessments: state.assessments,
                      history: state.history,
                      weekStart: calendar.weekStart,
                      fromDate: calendar.fromDate,
                  })
                : [];
            await insertWeek(
                tx,
                userId,
                { ...plan, days: studyDays.revisionDays } as RevisionSettings,
                calendar.weekStart,
                schedule,
            );
            week = await currentWeek(tx, userId, now, plan.timezone);
            state = await memory(
                tx,
                userId,
                week?.riwayah ?? plan.riwayah,
                catalogue,
            );
        }
        const today = weekCalendar(
            now,
            week?.timezone ?? plan?.timezone ?? "Africa/Casablanca",
        ).today;
        const items = week
            ? carryForwardSessions(
                  sessionViews(state, week, catalogue, now).sort(
                      (a, b) => a.ordinal - b.ordinal,
                  ),
                  today,
                  studyDays?.revisionDays ?? [],
                  week.timezone,
                  week.days,
              )
            : [];
        return {
            plan: plan
                ? { ...plan, updatedAt: plan.updatedAt.toISOString() }
                : null,
            week: week
                ? { ...week, createdAt: week.createdAt.toISOString() }
                : null,
            today,
            sessions: items.map((item) => ({
                ...item,
                active: isActivePlanSession(
                    item,
                    today,
                    Boolean(plan?.enabled),
                ),
            })),
            setup: Boolean(state.record?.setupAt),
            completedHizbs: state.complete.length,
            memorizedAyahs: state.memorizedAyahs,
            rotation: plan
                ? buildRevisionRotation({
                      catalogue,
                      settings: {
                          ...plan,
                          days: studyDays?.revisionDays ?? [],
                      } as RevisionSettings,
                      covered: state.covered,
                      assessments: state.assessments,
                      history: state.history,
                      current: week ? { ...week, sessions: items } : undefined,
                      today: weekCalendar(now, plan.timezone).today,
                  })
                : null,
            version: await planVersion(tx, userId, "revision"),
        };
    });
}
export type RevisionView = Awaited<ReturnType<typeof getRevisionView>>;
export type RevisionPreview = Awaited<ReturnType<typeof previewRevisionPlan>>;

export async function updateRevisionSession(
    userId: string,
    sessionId: string,
    change:
        | { surahNumber: number; ayahNumber: number }
        | { outcome: "comfortable" | "difficult" },
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const [plan] = await tx
            .select()
            .from(revisionPlan)
            .where(eq(revisionPlan.userId, userId));
        const [row] = await tx
            .select({ session: revisionSession, week: revisionWeek })
            .from(revisionSession)
            .innerJoin(
                revisionWeek,
                eq(revisionWeek.id, revisionSession.weekId),
            )
            .where(
                and(
                    eq(revisionSession.id, sessionId),
                    eq(revisionSession.userId, userId),
                ),
            )
            .for("update", { of: revisionSession });
        if (!row || !plan?.enabled)
            return { success: false as const, reason: "inactive" as const };
        const { session, week } = row;
        const now = await clock(tx);
        const active = await currentWeek(tx, userId, now, plan.timezone);
        if (active?.id !== week.id || session.completedAt)
            return { success: false as const, reason: "inactive" as const };
        const state = await memory(tx, userId, week.riwayah, catalogue);
        const today = weekCalendar(now, week.timezone).today;
        const [schedule] = await tx
            .select()
            .from(learningSchedule)
            .where(eq(learningSchedule.userId, userId));
        const projected = carryForwardSessions(
            sessionViews(state, week, catalogue, now),
            today,
            schedule?.revisionDays ?? [],
            week.timezone,
            week.days,
        ).find((item) => item.id === sessionId);
        if (!projected || !isActivePlanSession(projected, today, plan.enabled))
            return { success: false as const, reason: "inactive" as const };
        const verses = assessmentVerses(catalogue, {
            ...session,
            riwayah: week.riwayah,
        });
        if (!verses.every((v) => isMemorized(v, state.covered)))
            return { success: false as const };
        const coverage = revisionCoverage(
            catalogue,
            { ...session, riwayah: week.riwayah },
            weekPeerAtoms(
                catalogue,
                state.assessments,
                week.weekStart,
                week.timezone,
                now,
            ),
        );
        if (coverage.done) return { success: true as const, completed: true };
        const last = coverage.remaining.at(-1) as (typeof verses)[number];
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
                .update(revisionSession)
                .set({
                    progressSurahNumber: change.surahNumber,
                    progressAyahNumber: change.ayahNumber,
                })
                .where(eq(revisionSession.id, sessionId));
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
        // Credit only the ayahs not already covered by the circle. Gaps stay separate.
        const segments: (typeof verses)[] = [];
        for (const v of coverage.remaining) {
            const segment = segments.at(-1);
            const previous = segment?.at(-1);
            if (previous && verses.indexOf(v) === verses.indexOf(previous) + 1)
                segment?.push(v);
            else segments.push([v]);
        }
        for (const [i, segment] of segments.entries()) {
            const first = segment[0],
                end = segment[segment.length - 1];
            await recordAssessment(
                tx,
                {
                    id: sessionId,
                    assigneeId: userId,
                    riwayah: week.riwayah,
                    startSurahNumber: first.surahNumber,
                    startAyahNumber: first.ayahNumber,
                    endSurahNumber: end.surahNumber,
                    endAyahNumber: end.ayahNumber,
                },
                {
                    method: "self",
                    outcome:
                        change.outcome === "comfortable"
                            ? "confirmed"
                            : "needs_revision",
                    reviewerId: userId,
                    sourceKey: `weekly:${sessionId}:${i}`,
                },
            );
        }
        await tx
            .update(revisionSession)
            .set({ outcome: change.outcome, completedAt: now })
            .where(eq(revisionSession.id, sessionId));
        return { success: true as const, completed: true };
    });
}
