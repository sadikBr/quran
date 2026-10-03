import "server-only";
import { createHash } from "node:crypto";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import db from "@/drizzle/db";
import {
    memorizationGroup,
    memorizationPlan,
    memorizationSession,
    practiceAssignment,
    revisionPlan,
    revisionSession,
    userKhatmahPlan,
    userWird,
    userWirdHistory,
    weeklyPlanning,
} from "@/drizzle/schema";
import { planVersion } from "@/features/learning/server/plan-lifecycle";
import { getMemorizationPlanView } from "@/features/learning/server/service";
import { assessmentVerses } from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import { lockRecord } from "@/features/memorization/server/record-service";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getRevisionView } from "@/features/revision/server/service";
import type { Riwayah } from "@/features/settings/preferences";
import getPreferences from "@/features/settings/server/get-preferences";
import getWirdDate from "@/features/wird/server/wird-date";
import {
    type PlanningDraft,
    type PlanningTask,
    type PlanningView,
    validatePlacements,
    weekDates,
} from "../planner";
import { buildWirdPlanningTasks } from "../wird-tasks";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const hash = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
const shift = (date: string, days: number) =>
    DateTime.fromISO(date, { zone: "UTC" })
        .plus({ days })
        .toISODate() as string;

async function rawState(
    userId: string,
    weekStart: string,
    tx: typeof db | Tx = db,
    lock = false,
) {
    const from = DateTime.fromISO(weekStart, { zone: "Africa/Casablanca" });
    let wirdQuery = tx
        .select()
        .from(userWird)
        .where(eq(userWird.userId, userId))
        .$dynamic();
    let khatmahQuery = tx
        .select()
        .from(userKhatmahPlan)
        .where(eq(userKhatmahPlan.userId, userId))
        .$dynamic();
    if (lock) {
        wirdQuery = wirdQuery.for("update");
        khatmahQuery = khatmahQuery.for("update");
    }
    // Match the reader's lock order: current portion before its khatmah plan.
    const [wird] = await wirdQuery;
    const [khatmah] = await khatmahQuery;
    let query = tx
        .select({
            assignment: practiceAssignment,
            groupName: memorizationGroup.name,
            active: memorizationGroup.isActive,
        })
        .from(practiceAssignment)
        .leftJoin(
            memorizationGroup,
            eq(practiceAssignment.groupId, memorizationGroup.id),
        )
        .where(eq(practiceAssignment.assigneeId, userId))
        .orderBy(asc(practiceAssignment.id))
        .$dynamic();
    if (lock) query = query.for("update", { of: practiceAssignment });
    const [assignments, [saved], wirdHistory] = await Promise.all([
        query,
        tx
            .select()
            .from(weeklyPlanning)
            .where(
                and(
                    eq(weeklyPlanning.userId, userId),
                    eq(weeklyPlanning.weekStart, weekStart),
                ),
            ),
        tx
            .select()
            .from(userWirdHistory)
            .where(
                and(
                    eq(userWirdHistory.userId, userId),
                    gte(userWirdHistory.completedAt, from.toJSDate()),
                    lt(
                        userWirdHistory.completedAt,
                        from.plus({ days: 7 }).toJSDate(),
                    ),
                ),
            )
            .orderBy(asc(userWirdHistory.id)),
    ]);
    return {
        assignments,
        saved: saved ?? null,
        wird: wird ?? null,
        khatmah: khatmah ?? null,
        wirdHistory,
    };
}

type PlanView =
    | Awaited<ReturnType<typeof getMemorizationPlanView>>
    | Awaited<ReturnType<typeof getRevisionView>>;
function planTasks(
    kind: "memorization" | "revision",
    view: PlanView,
    dates: string[],
    estimates: Record<string, number>,
): PlanningTask[] {
    if (!view.week) return [];
    const originalDates = [
        ...new Set(
            view.sessions.map((session) => session.originalScheduledDate),
        ),
    ].sort();
    return originalDates.flatMap((originalDate, sequence) => {
        const sessions = view.sessions.filter(
            (session) => session.originalScheduledDate === originalDate,
        );
        const pending = sessions.filter((session) => !session.done);
        const date = (pending[0] ?? sessions[0]).scheduledDate;
        if (!date || !dates.includes(date)) return [];
        const id = `${kind}:${view.week?.id}:${originalDate}`;
        const completedToday = view.sessions.some(
            (session) =>
                session.done &&
                session.completedAt &&
                session.scheduledDate === view.today &&
                session.originalScheduledDate !== originalDate,
        );
        const today = completedToday ? shift(view.today, 1) : view.today;
        const reviewAfter = sessions
            .map((session) =>
                "reviewAfter" in session ? session.reviewAfter : null,
            )
            .filter((day): day is string => Boolean(day))
            .sort()
            .at(-1);
        const minDate = [today, dates[0], reviewAfter ?? dates[0]]
            .sort()
            .at(-1) as string;
        const done = pending.length === 0;
        const movable =
            Boolean(view.plan?.enabled) &&
            !done &&
            sessions.every(
                (session) =>
                    !session.done &&
                    (!("available" in session) || session.available),
            ) &&
            date >= view.today &&
            minDate <= dates[6];
        const minutes =
            estimates[id] ??
            Math.min(
                480,
                Math.max(
                    5,
                    Math.ceil(
                        (sessions.reduce(
                            (sum, session) => sum + session.total,
                            0,
                        ) *
                            (kind === "memorization" ? 2 : 0.5)) /
                            5,
                    ) * 5,
                ),
            );
        return [
            {
                id,
                kind,
                date,
                minutes,
                done,
                movable,
                minDate,
                maxDate: dates[6],
                timezone: view.week?.timezone ?? "Africa/Casablanca",
                deadline: null,
                groupName: null,
                sequence,
                sessionIds: sessions.map((session) => session.id),
                ranges: sessions.map(
                    ({
                        startSurahNumber,
                        startAyahNumber,
                        endSurahNumber,
                        endAyahNumber,
                    }) => ({
                        startSurahNumber,
                        startAyahNumber,
                        endSurahNumber,
                        endAyahNumber,
                    }),
                ),
                href: pending.some((session) => session.active)
                    ? "/practice"
                    : null,
            },
        ];
    });
}

async function loadPlanning(userId: string, requestedWeek?: string) {
    const preferences = await getPreferences();
    const timezone = preferences.adhkarTimezone;
    const now = DateTime.now().setZone(timezone);
    const today = now.toISODate() as string;
    const currentWeek = now.startOf("week").toISODate() as string;
    const requested = requestedWeek
        ? DateTime.fromISO(requestedWeek, { zone: timezone })
        : now;
    const weekStart =
        requested.isValid &&
        requested.weekday === 1 &&
        requestedWeek &&
        requestedWeek >= currentWeek &&
        requestedWeek <= shift(currentWeek, 21)
            ? requestedWeek
            : currentWeek;
    const dates = weekDates(weekStart);
    const [memorization, revision, raw, catalogue, navigation, surahs] =
        await Promise.all([
            getMemorizationPlanView(userId, preferences.riwayah),
            getRevisionView(userId, preferences.riwayah),
            rawState(userId, weekStart),
            getMemoryCatalogue(),
            getQuranNavigationMeta(),
            getSurahsMeta(),
        ]);
    const estimates = raw.saved?.estimates ?? {};
    const tasks = [
        ...planTasks("memorization", memorization, dates, estimates),
        ...planTasks("revision", revision, dates, estimates),
        ...buildWirdPlanningTasks({
            record: raw.wird,
            plan: raw.khatmah,
            history: raw.wirdHistory,
            dates,
            today: getWirdDate(now.toJSDate()),
            navigation,
            surahs,
            catalogue,
            riwayah: preferences.riwayah,
            estimates,
        }),
    ];
    for (const { assignment: item, groupName, active } of raw.assignments) {
        if (
            (item.groupId && !active) ||
            ![
                "in_progress",
                "needs_revision",
                "not_completed",
                "completed",
                "submitted",
            ].includes(item.status)
        )
            continue;
        const deadline = item.dueAt
            ? DateTime.fromJSDate(item.dueAt, { zone: timezone }).toISODate()
            : null;
        const done = item.status === "completed" || item.status === "submitted";
        let date = item.plannedDate;
        // A circle can bring its deadline forward after preparation was planned.
        if (!done && item.groupId && deadline && date && date > deadline)
            date = deadline;
        if (!date && item.groupId && deadline && dates.includes(deadline))
            date = deadline;
        // Carry unfinished personal preparation into the current week's inbox without changing its deadline.
        if (!done && date && date < today && weekStart === currentWeek)
            date = null;
        if (date && !dates.includes(date)) continue;
        if (
            !date &&
            (done ||
                (weekStart !== currentWeek && deadline && deadline < weekStart))
        )
            continue;
        const id = `assignment:${item.id}`;
        const minDate = today > dates[0] ? today : dates[0];
        const maxDate = deadline && deadline < dates[6] ? deadline : dates[6];
        const total = assessmentVerses(catalogue, {
            ...item,
            riwayah: item.riwayah as Riwayah,
        }).length;
        tasks.push({
            id,
            kind: item.groupId ? "circle" : "practice",
            date,
            minutes:
                estimates[id] ??
                Math.min(
                    480,
                    Math.max(
                        5,
                        Math.ceil(
                            (total * (item.kind === "memorization" ? 2 : 0.5)) /
                                5,
                        ) * 5,
                    ),
                ),
            done,
            movable: !done && minDate <= maxDate,
            minDate,
            maxDate,
            timezone,
            deadline,
            groupName,
            sequence: null,
            sessionIds: [item.id],
            ranges: [
                {
                    startSurahNumber: item.startSurahNumber,
                    startAyahNumber: item.startAyahNumber,
                    endSurahNumber: item.endSurahNumber,
                    endAyahNumber: item.endAyahNumber,
                },
            ],
            href: done ? null : `/practice/${item.id}/read`,
        });
    }
    const version = hash({
        userId,
        weekStart,
        today,
        timezone,
        riwayah: preferences.riwayah,
        wDay: getWirdDate(now.toJSDate()),
        m: memorization.version,
        r: revision.version,
        mDay: memorization.week ? memorization.today : null,
        rDay: revision.week ? revision.today : null,
        raw,
    });
    const view: PlanningView = {
        weekStart,
        today,
        timezone,
        version,
        capacities: raw.saved?.capacities ?? [
            180, 180, 180, 180, 180, 180, 180,
        ],
        tasks,
    };
    return { view, memorization, revision, raw, riwayah: preferences.riwayah };
}

export async function getPlanningView(userId: string, requestedWeek?: string) {
    return (await loadPlanning(userId, requestedWeek)).view;
}

export async function commitPlanningWeek(
    userId: string,
    draft: PlanningDraft,
    acknowledgeOverload = false,
) {
    const state = await loadPlanning(userId, draft.weekStart);
    const invalid = validatePlacements(state.view, draft);
    if (invalid) return { success: false as const, reason: invalid };
    const dates = weekDates(draft.weekStart);
    if (
        !acknowledgeOverload &&
        dates.some(
            (date, index) =>
                draft.tasks
                    .filter((task) => task.date === date)
                    .reduce((sum, task) => sum + task.minutes, 0) >
                draft.capacities[index],
        )
    )
        return { success: false as const, reason: "overload" as const };
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const [m, r, raw] = await Promise.all([
            planVersion(tx, userId, "memorization"),
            planVersion(tx, userId, "revision"),
            rawState(userId, draft.weekStart, tx, true),
        ]);
        const clock = await tx.execute<{ now: Date }>(
            sql`select clock_timestamp() as now`,
        );
        const today = DateTime.fromJSDate(new Date(clock.rows[0].now), {
            zone: state.view.timezone,
        }).toISODate();
        if (
            hash({
                userId,
                weekStart: draft.weekStart,
                today,
                timezone: state.view.timezone,
                riwayah: state.riwayah,
                wDay: getWirdDate(new Date(clock.rows[0].now)),
                m,
                r,
                mDay: state.memorization.week
                    ? DateTime.fromJSDate(new Date(clock.rows[0].now), {
                          zone: state.memorization.week.timezone,
                      }).toISODate()
                    : null,
                rDay: state.revision.week
                    ? DateTime.fromJSDate(new Date(clock.rows[0].now), {
                          zone: state.revision.week.timezone,
                      }).toISODate()
                    : null,
                raw,
            }) !== draft.version
        )
            return { success: false as const, reason: "stale" as const };
        const byId = new Map(draft.tasks.map((task) => [task.id, task]));
        for (const [kind, view, table, plan] of [
            [
                "memorization",
                state.memorization,
                memorizationSession,
                memorizationPlan,
            ],
            ["revision", state.revision, revisionSession, revisionPlan],
        ] as const) {
            const changed = state.view.tasks.filter(
                (task) =>
                    task.kind === kind && byId.get(task.id)?.date !== task.date,
            );
            if (!changed.length) continue;
            const overrides = new Map(
                changed.flatMap((task) =>
                    task.sessionIds.map(
                        (id) => [id, byId.get(task.id)?.date] as const,
                    ),
                ),
            );
            // Pin unchanged pending portions too, so moving one day never silently pulls a later week forward.
            for (const session of view.sessions) {
                if (session.done || !session.scheduledDate) continue;
                await tx
                    .update(table)
                    .set({
                        plannedDate:
                            overrides.get(session.id) ?? session.scheduledDate,
                    })
                    .where(
                        and(eq(table.userId, userId), eq(table.id, session.id)),
                    );
            }
            await tx
                .update(plan)
                .set({ revision: sql`${plan.revision} + 1` })
                .where(eq(plan.userId, userId));
        }
        for (const task of state.view.tasks.filter(
            (task) => task.sequence === null && task.movable,
        )) {
            const proposed = byId.get(task.id);
            const savedDate = raw.assignments.find(
                ({ assignment }) => assignment.id === task.sessionIds[0],
            )?.assignment.plannedDate;
            if (proposed && proposed.date !== savedDate)
                await tx
                    .update(practiceAssignment)
                    .set({ plannedDate: proposed.date })
                    .where(
                        and(
                            eq(practiceAssignment.assigneeId, userId),
                            inArray(practiceAssignment.id, task.sessionIds),
                        ),
                    );
        }
        const value = {
            capacities: draft.capacities,
            estimates: Object.fromEntries(
                draft.tasks.map((task) => [task.id, task.minutes]),
            ),
            revision: (raw.saved?.revision ?? 0) + 1,
        };
        await tx
            .insert(weeklyPlanning)
            .values({ userId, weekStart: draft.weekStart, ...value })
            .onConflictDoUpdate({
                target: [weeklyPlanning.userId, weeklyPlanning.weekStart],
                set: value,
            });
        return { success: true as const };
    });
}
