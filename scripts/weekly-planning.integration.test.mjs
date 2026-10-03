import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DateTime } from "luxon";
import pg from "pg";
import * as schema from "../src/drizzle/schema";
import { carryForwardSessions } from "../src/features/learning/carry-forward";
import * as progress from "../src/features/memorization/progress";
import * as planner from "../src/features/planning/planner";
import * as wirdTasks from "../src/features/planning/wird-tasks";
import getWirdDate from "../src/features/wird/server/wird-date";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const target = process.env.PLANNING_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: weekly planning persists actual dates atomically and rejects stale or foreign drafts",
    async () => {
        if (!new URL(target).pathname.endsWith("_planning_tests"))
            throw new Error(
                "Use an empty disposable database ending in _planning_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        try {
            const tables = await pool.query(
                "select count(*)::int as count from information_schema.tables where table_schema='public'",
            );
            if (tables.rows[0].count)
                throw new Error("Refusing a nonempty test database.");
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            await db.insert(schema.user).values(
                ["owner", "other"].map((id) => ({
                    id,
                    name: id,
                    email: `${id}@example.test`,
                })),
            );
            await db
                .insert(schema.memorizationRecord)
                .values([{ userId: "owner" }, { userId: "other" }]);
            const weekStart = DateTime.now()
                .setZone("UTC")
                .startOf("week")
                .plus({ weeks: 1 })
                .toISODate();
            const dates = planner.weekDates(weekStart);
            const studyDays = [1, 3, 5];
            await db.insert(schema.learningSchedule).values({
                userId: "owner",
                memorizationDays: studyDays,
                revisionDays: studyDays,
            });
            await db.insert(schema.memorizationPlan).values({
                userId: "owner",
                enabled: true,
                quartersPerWeek: 3,
                direction: "forward",
                timezone: "UTC",
                riwayah: "hafs",
            });
            await db.insert(schema.memorizationWeek).values({
                id: "week",
                userId: "owner",
                weekStart,
                timezone: "UTC",
                riwayah: "hafs",
                days: studyDays,
                quartersPerWeek: 3,
            });
            await db.insert(schema.memorizationSession).values(
                [0, 2, 4].map((day, ordinal) => ({
                    id: `m${ordinal}`,
                    userId: "owner",
                    weekId: "week",
                    scheduledDate: dates[day],
                    ordinal,
                    quarters: [ordinal + 1],
                    startSurahNumber: 2,
                    startAyahNumber: ordinal * 8 + 1,
                    endSurahNumber: 2,
                    endAyahNumber: ordinal * 8 + 8,
                })),
            );
            await db.insert(schema.memorizationGroup).values({
                id: "circle",
                name: "Test circle",
                createdById: "owner",
                inviteCode: "planner-test",
                isActive: true,
            });
            const due = new Date(`${dates[2]}T18:00:00Z`);
            await db.insert(schema.practiceAssignment).values([
                {
                    id: "personal",
                    assigneeId: "owner",
                    assignedById: "owner",
                    kind: "revision",
                    riwayah: "hafs",
                    startSurahNumber: 2,
                    startAyahNumber: 1,
                    endSurahNumber: 2,
                    endAyahNumber: 8,
                },
                {
                    id: "circle-work",
                    assigneeId: "owner",
                    assignedById: "owner",
                    groupId: "circle",
                    dueAt: due,
                    kind: "memorization",
                    riwayah: "hafs",
                    startSurahNumber: 2,
                    startAyahNumber: 9,
                    endSurahNumber: 2,
                    endAyahNumber: 16,
                },
                {
                    id: "foreign",
                    assigneeId: "other",
                    assignedById: "other",
                    kind: "revision",
                    riwayah: "hafs",
                    startSurahNumber: 2,
                    startAyahNumber: 1,
                    endSurahNumber: 2,
                    endAyahNumber: 8,
                },
            ]);
            const verses = Array.from({ length: 24 }, (_, i) => ({
                surahNumber: 2,
                ayahNumber: i + 1,
                quarter: Math.floor(i / 8) + 1,
                hizb: 1,
                page: 1,
                atoms: [`a${i}`],
            }));
            const catalogue = { hafs: verses, warsh: verses };
            const modules = {
                "server-only": {},
                "node:crypto": { createHash },
                "drizzle-orm": orm,
                luxon: { DateTime },
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
            };
            const lifecycle = loadTypeScript(
                "src/features/learning/server/plan-lifecycle.ts",
                modules,
            );
            const records = loadTypeScript(
                "src/features/memorization/server/record-service.ts",
                {
                    ...modules,
                    "../progress": progress,
                    "./get-memory-catalogue": async () => catalogue,
                    "@/features/learning/server/reconcile-plan": {},
                    "@/features/revision/server/reconcile-plan": {},
                },
            );
            const planView = async (userId, kind) => {
                const today = DateTime.now().setZone("UTC").toISODate();
                if (kind === "revision" || userId !== "owner")
                    return {
                        plan: null,
                        week: null,
                        sessions: [],
                        today,
                        version: await lifecycle.planVersion(db, userId, kind),
                    };
                const [plan] = await db
                    .select()
                    .from(schema.memorizationPlan)
                    .where(orm.eq(schema.memorizationPlan.userId, userId));
                const [week] = await db
                    .select()
                    .from(schema.memorizationWeek)
                    .where(orm.eq(schema.memorizationWeek.userId, userId));
                const rows = await db
                    .select()
                    .from(schema.memorizationSession)
                    .where(orm.eq(schema.memorizationSession.userId, userId))
                    .orderBy(schema.memorizationSession.ordinal);
                const sessions = carryForwardSessions(
                    rows.map((s) => ({
                        ...s,
                        done: Boolean(s.completedAt),
                        completedAt: s.completedAt?.toISOString() ?? null,
                        total: 8,
                        active: false,
                    })),
                    today,
                    studyDays,
                    "UTC",
                    studyDays,
                );
                return {
                    plan,
                    week,
                    sessions,
                    today,
                    version: await lifecycle.planVersion(db, userId, kind),
                };
            };
            const service = loadTypeScript(
                "src/features/planning/server/service.ts",
                {
                    ...modules,
                    "../planner": planner,
                    "../wird-tasks": wirdTasks,
                    "@/features/wird/server/wird-date": getWirdDate,
                    "@/features/quran/server/get-quran-navigation-meta":
                        async () => ({
                            pages: [],
                            hizbs: [],
                            hizbQuarters: [],
                            juzs: [],
                        }),
                    "@/features/quran/server/get-surahs-meta": async () => [],
                    "@/features/learning/server/plan-lifecycle": lifecycle,
                    "@/features/learning/server/service": {
                        getMemorizationPlanView: (id) =>
                            planView(id, "memorization"),
                    },
                    "@/features/revision/server/service": {
                        getRevisionView: (id) => planView(id, "revision"),
                    },
                    "@/features/memorization/progress": progress,
                    "@/features/memorization/server/get-memory-catalogue":
                        async () => catalogue,
                    "@/features/memorization/server/record-service": records,
                    "@/features/settings/server/get-preferences": async () => ({
                        adhkarTimezone: "UTC",
                        riwayah: "hafs",
                    }),
                },
            );
            let view = await service.getPlanningView("owner", weekStart);
            expect(view.tasks).toHaveLength(5);
            expect(view.tasks.some((t) => t.id === "assignment:foreign")).toBe(
                false,
            );
            const earlierWeek = DateTime.fromISO(weekStart)
                .minus({ weeks: 1 })
                .toISODate();
            const earlierView = await service.getPlanningView(
                "owner",
                earlierWeek,
            );
            const earlyCircle = earlierView.tasks.find(
                (t) => t.id === "assignment:circle-work",
            );
            expect(earlyCircle.date).toBeNull();
            expect(earlyCircle.movable).toBe(true);
            expect(earlyCircle.deadline).toBe(dates[2]);
            let draft = planner.initialDraft(view);
            draft.tasks.find(
                (t) => t.id.startsWith("memorization") && t.date === dates[0],
            ).date = dates[1];
            draft.tasks.find(
                (t) => t.id.startsWith("memorization") && t.date === dates[2],
            ).date = dates[3];
            draft.tasks.find((t) => t.id === "assignment:personal").date =
                dates[1];
            draft.tasks.find((t) => t.id === "assignment:circle-work").date =
                dates[1];
            draft.capacities = Array(7).fill(0);
            expect(
                (await service.commitPlanningWeek("owner", draft)).reason,
            ).toBe("overload");
            expect(await db.select().from(schema.weeklyPlanning)).toHaveLength(
                0,
            );
            draft.capacities = Array(7).fill(120);
            expect(
                (await service.commitPlanningWeek("other", draft)).success,
            ).toBe(false);
            expect(await service.commitPlanningWeek("owner", draft)).toEqual({
                success: true,
            });
            const rows = await db
                .select()
                .from(schema.memorizationSession)
                .orderBy(schema.memorizationSession.ordinal);
            expect(rows.map((r) => r.plannedDate)).toEqual([
                dates[1],
                dates[3],
                dates[4],
            ]);
            expect(rows.map((r) => r.scheduledDate)).toEqual([
                dates[0],
                dates[2],
                dates[4],
            ]);
            const [circle] = await db
                .select()
                .from(schema.practiceAssignment)
                .where(orm.eq(schema.practiceAssignment.id, "circle-work"));
            expect(circle.dueAt.toISOString()).toBe(due.toISOString());
            expect(circle.plannedDate).toBe(dates[1]);
            expect(
                (await service.commitPlanningWeek("owner", draft)).reason,
            ).toBe("stale");
            view = await service.getPlanningView("owner", weekStart);
            expect(
                view.tasks
                    .filter((t) => t.kind === "memorization")
                    .map((t) => t.date),
            ).toEqual([dates[1], dates[3], dates[4]]);
            expect(view.capacities).toEqual(Array(7).fill(120));
            draft = planner.initialDraft(view);
            draft.tasks.find((t) => t.id === "assignment:circle-work").date =
                dates[4];
            expect(
                (await service.commitPlanningWeek("owner", draft)).reason,
            ).toBe("date");
            // A failure after session writes must roll back dates, estimates and budgets together.
            draft = planner.initialDraft(view);
            draft.capacities[0] = 123;
            draft.tasks.find(
                (t) => t.id.startsWith("memorization") && t.date === dates[1],
            ).date = dates[0];
            await pool.query(
                "ALTER TABLE weekly_planning ADD CONSTRAINT injected_failure CHECK ((capacities->>0)::int <> 123)",
            );
            await expect(
                service.commitPlanningWeek("owner", draft),
            ).rejects.toThrow();
            expect(
                (
                    await db
                        .select()
                        .from(schema.memorizationSession)
                        .where(orm.eq(schema.memorizationSession.id, "m0"))
                )[0].plannedDate,
            ).toBe(dates[1]);
            await pool.query(
                "ALTER TABLE weekly_planning DROP CONSTRAINT injected_failure",
            );
            draft = planner.initialDraft(
                await service.getPlanningView("owner", weekStart),
            );
            draft.capacities[0] = 100;
            const results = await Promise.all([
                service.commitPlanningWeek("owner", draft),
                service.commitPlanningWeek("owner", draft),
            ]);
            expect(results.filter((result) => result.success)).toHaveLength(1);
            expect(results.find((result) => !result.success).reason).toBe(
                "stale",
            );
            await db
                .update(schema.practiceAssignment)
                .set({ status: "completed" })
                .where(orm.eq(schema.practiceAssignment.id, "personal"));
            draft = planner.initialDraft(
                await service.getPlanningView("owner", weekStart),
            );
            draft.tasks.find((t) => t.id === "assignment:personal").date =
                dates[5];
            expect(
                (await service.commitPlanningWeek("owner", draft)).reason,
            ).toBe("locked");
            await db
                .update(schema.practiceAssignment)
                .set({ dueAt: new Date(`${dates[0]}T18:00:00Z`) })
                .where(orm.eq(schema.practiceAssignment.id, "circle-work"));
            view = await service.getPlanningView("owner", weekStart);
            expect(
                view.tasks.find((t) => t.id === "assignment:circle-work").date,
            ).toBe(dates[0]);
            draft = planner.initialDraft(view);
            expect(await service.commitPlanningWeek("owner", draft)).toEqual({
                success: true,
            });
            expect(
                (
                    await db
                        .select()
                        .from(schema.practiceAssignment)
                        .where(
                            orm.eq(schema.practiceAssignment.id, "circle-work"),
                        )
                )[0].plannedDate,
            ).toBe(dates[0]);

            await db.insert(schema.userWird).values([
                {
                    userId: "owner",
                    unit: "ayah",
                    amount: 2,
                    targetDate: weekStart,
                    targetStartGlobalAyah: 1,
                    targetEndGlobalAyah: 2,
                },
                {
                    userId: "other",
                    unit: "ayah",
                    amount: 2,
                    targetDate: weekStart,
                    targetStartGlobalAyah: 21,
                    targetEndGlobalAyah: 22,
                },
            ]);
            const [savedWird] = await db
                .select()
                .from(schema.userWird)
                .where(orm.eq(schema.userWird.userId, "owner"));
            view = await service.getPlanningView("owner", weekStart);
            expect(view.tasks.filter((t) => t.kind === "wird")).toHaveLength(7);
            expect(
                view.tasks.find((t) => t.kind === "wird").ranges[0]
                    .startAyahNumber,
            ).toBe(1);
            draft = planner.initialDraft(view);
            draft.tasks.find((t) => t.id === `wird:${dates[0]}`).date =
                dates[1];
            expect(
                (await service.commitPlanningWeek("owner", draft)).reason,
            ).toBe("locked");
            draft = planner.initialDraft(view);
            draft.tasks.find((t) => t.id === `wird:${dates[0]}`).minutes = 25;
            expect(await service.commitPlanningWeek("owner", draft)).toEqual({
                success: true,
            });
            expect(
                (
                    await db
                        .select()
                        .from(schema.userWird)
                        .where(orm.eq(schema.userWird.userId, "owner"))
                )[0],
            ).toEqual(savedWird);
            view = await service.getPlanningView("owner", weekStart);
            expect(
                view.tasks.find((t) => t.id === `wird:${dates[0]}`).minutes,
            ).toBe(25);
            draft = planner.initialDraft(view);
            await db
                .update(schema.userWird)
                .set({ nextGoal: { unit: "ayah", amount: 3 } })
                .where(orm.eq(schema.userWird.userId, "owner"));
            expect(
                (await service.commitPlanningWeek("owner", draft)).reason,
            ).toBe("stale");
        } finally {
            await pool.end();
        }
    },
    30000,
);
