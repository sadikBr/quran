import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import db from "@/drizzle/db";
import {
    memorizationAssessment,
    memorizationRecord,
    revisionPlan,
    revisionSession,
    revisionWeek,
    userMemorizedHizb,
} from "@/drizzle/schema";
import {
    assessmentVerses,
    calculateMemorization,
    type MemoryCatalogue,
    type Riwayah,
} from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import {
    lockRecord,
    recordAssessment,
} from "@/features/memorization/server/record-service";
import {
    dueRevisionDate,
    generateRevisionSchedule,
    type RevisionSettings,
    revisionCoverage,
    revisionWeekEnd,
    type ScheduledRange,
    verseKey,
    weekBounds,
    weekCalendar,
    weekPeerAtoms,
} from "../schedule";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function clock(tx: Tx) {
    const result = await tx.execute<{ now: Date }>(
        sql`select clock_timestamp() as now`,
    );
    return new Date(result.rows[0].now);
}
async function memory(
    tx: Tx,
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
    )
        .filter((h) => h.total > 0 && h.percent === 100)
        .map((h) => h.number);
    return {
        record,
        complete,
        assessments,
        history: history.map(({ session, week }) => ({
            ...session,
            riwayah: week.riwayah,
            weekStart: week.weekStart,
            timezone: week.timezone,
        })),
    };
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
async function makePreview(
    tx: Tx,
    userId: string,
    settings: RevisionSettings,
    catalogue: MemoryCatalogue,
) {
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
    const weekStart = current
        ? (DateTime.fromISO(current.weekStart)
              .plus({ weeks: 1 })
              .toISODate() as string)
        : calendar.weekStart;
    const state = await memory(tx, userId, settings.riwayah, catalogue);
    const sessions = generateRevisionSchedule({
        catalogue,
        settings,
        completedHizbs: state.complete,
        assessments: state.assessments,
        history: state.history,
        weekStart,
        fromDate: current ? weekStart : calendar.today,
    });
    const revision = plan?.revision ?? 0;
    const key = createHash("sha256")
        .update(
            JSON.stringify({
                settings,
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
        ready: Boolean(state.record?.setupAt) && state.complete.length > 0,
        nextWeek: Boolean(current),
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
    return (
        weeks.find((week) => {
            const b = weekBounds(week.weekStart, week.timezone);
            return +now >= b.start && +now < b.end;
        }) ??
        weeks.find(
            (week) => week.weekStart === weekCalendar(now, timezone).weekStart,
        )
    );
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
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(
        (tx) => makePreview(tx, userId, settings, catalogue),
        { isolationLevel: "repeatable read", accessMode: "read only" },
    );
}
export async function saveRevisionPlan(
    userId: string,
    settings: RevisionSettings,
    expectedKey: string,
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const preview = await makePreview(tx, userId, settings, catalogue);
        if (preview.key !== expectedKey)
            return { success: false as const, reason: "stale" as const };
        if (!preview.ready)
            return { success: false as const, reason: "empty" as const };
        await tx
            .insert(revisionPlan)
            .values({ ...settings, userId, enabled: true, revision: 1 })
            .onConflictDoUpdate({
                target: revisionPlan.userId,
                set: {
                    ...settings,
                    enabled: true,
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
        const [plan] = await tx
            .select()
            .from(revisionPlan)
            .where(eq(revisionPlan.userId, userId));
        const now = await clock(tx);
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
        if (plan?.enabled && !week) {
            const calendar = weekCalendar(now, plan.timezone);
            const schedule = state.record?.setupAt
                ? generateRevisionSchedule({
                      catalogue,
                      settings: plan as RevisionSettings,
                      completedHizbs: state.complete,
                      assessments: state.assessments,
                      history: state.history,
                      weekStart: calendar.weekStart,
                      fromDate: calendar.today,
                  })
                : [];
            await insertWeek(
                tx,
                userId,
                plan as RevisionSettings,
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
        const sessions = week
            ? await tx
                  .select()
                  .from(revisionSession)
                  .where(eq(revisionSession.weekId, week.id))
                  .orderBy(asc(revisionSession.ordinal))
            : [];
        const peer = week
            ? weekPeerAtoms(
                  catalogue,
                  state.assessments,
                  week.weekStart,
                  week.timezone,
              )
            : new Set<string>();
        const items = sessions.map((session) => {
            const riwayah = week?.riwayah ?? "hafs";
            const coverage = revisionCoverage(
                catalogue,
                { ...session, riwayah },
                peer,
            );
            const available = assessmentVerses(catalogue, {
                ...session,
                riwayah,
            }).every((v) => state.complete.includes(v.hizb));
            return {
                ...session,
                completedAt: session.completedAt?.toISOString() ?? null,
                riwayah,
                total: coverage.total,
                peer: coverage.peer,
                done: coverage.done,
                available,
                remaining: coverage.remaining.map(verseKey),
            };
        });
        return {
            plan: plan
                ? { ...plan, updatedAt: plan.updatedAt.toISOString() }
                : null,
            week: week
                ? { ...week, createdAt: week.createdAt.toISOString() }
                : null,
            today,
            sessions: items,
            setup: Boolean(state.record?.setupAt),
            completedHizbs: state.complete.length,
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
        if (!row || !plan?.enabled) return { success: false as const };
        const { session, week } = row;
        const now = await clock(tx);
        const bounds = weekBounds(week.weekStart, week.timezone);
        if (
            +now < bounds.start ||
            +now >=
                revisionWeekEnd(week.weekStart, week.timezone, plan.timezone) ||
            session.completedAt
        )
            return { success: false as const };
        const state = await memory(tx, userId, week.riwayah, catalogue);
        const verses = assessmentVerses(catalogue, {
            ...session,
            riwayah: week.riwayah,
        });
        if (!verses.every((v) => state.complete.includes(v.hizb)))
            return { success: false as const };
        const coverage = revisionCoverage(
            catalogue,
            { ...session, riwayah: week.riwayah },
            weekPeerAtoms(
                catalogue,
                state.assessments,
                week.weekStart,
                week.timezone,
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
