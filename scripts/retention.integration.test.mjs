import { expect, test } from "bun:test";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DateTime } from "luxon";
import pg from "pg";
import { z } from "zod";
import * as schema from "../src/drizzle/schema";
import * as progress from "../src/features/memorization/progress";
import * as activity from "../src/features/retention/activity";
import * as types from "../src/features/retention/types";
import * as schedule from "../src/features/revision/schedule";
import { databaseClock } from "./helpers/database-clock.mjs";
import { loadRetention } from "./helpers/load-retention.mjs";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const target = process.env.RETENTION_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "retention database: ownership, idempotency, concurrency, correction, paused follow-ups and weekly report",
    async () => {
        if (!new URL(target).pathname.endsWith("_retention_tests"))
            throw new Error(
                "Use an empty disposable _retention_tests database.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        try {
            const existing = await pool.query(
                "select count(*)::int n from information_schema.tables where table_schema='public'",
            );
            if (existing.rows[0].n)
                throw new Error("Refusing a nonempty database.");
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            const clock = databaseClock();
            clock.set(new Date("2026-10-05T10:00:00Z"));
            const modules = {
                "server-only": {},
                "drizzle-orm": { ...orm, sql: clock.sql },
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
            };
            const verses = Array.from({ length: 24 }, (_, i) => ({
                surahNumber: 2,
                ayahNumber: i + 1,
                quarter: Math.floor(i / 2) + 1,
                hizb: Math.floor(i / 8) + 1,
                page: 1,
                atoms: [`a${i + 1}`],
            }));
            const catalogue = {
                hafs: verses,
                warsh: verses.map((v) => ({ ...v })),
            };
            const records = loadTypeScript(
                "src/features/memorization/server/record-service.ts",
                {
                    ...modules,
                    "../progress": progress,
                    "./get-memory-catalogue": async () => catalogue,
                    "@/features/revision/server/reconcile-plan": {
                        reconcileRevisionPlan: async () => {},
                    },
                    "@/features/learning/server/reconcile-plan": {
                        reconcileMemorizationPlan: async () => {},
                    },
                },
            );
            const retention = loadRetention(modules),
                stateService = retention["@/features/retention/server/state"],
                planService =
                    retention["@/features/retention/server/follow-up-plan"];
            const mistakes = loadTypeScript(
                "src/features/retention/server/mistakes.ts",
                {
                    ...modules,
                    "@/features/memorization/progress": progress,
                    "@/features/memorization/server/record-service": records,
                },
            );
            const report = loadTypeScript(
                "src/features/retention/server/report.ts",
                {
                    ...modules,
                    luxon: { DateTime },
                    "@/features/memorization/progress": progress,
                    "@/features/memorization/server/get-memory-catalogue":
                        async () => catalogue,
                    "@/features/revision/schedule": schedule,
                    "../activity": activity,
                    "./state": stateService,
                },
            );
            let caller = "alice";
            const actions = loadTypeScript(
                "src/features/retention/server/actions.ts",
                {
                    ...modules,
                    zod: { z },
                    "next/cache": { revalidatePath() {} },
                    "next/headers": { headers: async () => new Headers() },
                    "@/features/auth/auth": {
                        auth: {
                            api: {
                                getSession: async () =>
                                    caller
                                        ? {
                                              user: { id: caller },
                                              session: {
                                                  createdAt: new Date(
                                                      "2026-01-01",
                                                  ),
                                              },
                                          }
                                        : null,
                            },
                        },
                    },
                    "@/features/memorization/server/get-memory-catalogue":
                        async () => catalogue,
                    "@/features/memorization/server/record-service": records,
                    "../types": types,
                    "./mistakes": mistakes,
                    "./state": stateService,
                },
            );
            for (const id of ["alice", "bob", "admin"])
                await db.insert(schema.user).values({
                    id,
                    name: id,
                    email: `${id}@example.test`,
                    role: id === "admin" ? "admin" : "member",
                });
            for (const id of ["alice", "bob"]) {
                await db.insert(schema.memorizationRecord).values({
                    userId: id,
                    setupAt: new Date("2026-10-01"),
                    baselineRiwayah: "hafs",
                });
                await db
                    .insert(schema.userMemorizedHizb)
                    .values({ userId: id, hizbNumber: 1 });
                await db.insert(schema.memorizationBaselineChange).values({
                    id: `baseline-${id}`,
                    userId: id,
                    previousHizbs: [],
                    hizbs: [1],
                    ranges: [],
                    previousRanges: [],
                    source: "setup",
                    createdAt: new Date("2026-10-01"),
                });
            }
            const input = {
                riwayah: "hafs",
                surahNumber: 2,
                ayahNumber: 1,
                kind: "word",
                note: "Notice the ending",
                eventId: crypto.randomUUID(),
            };
            caller = null;
            expect((await actions.addMemorizationMistake(input)).success).toBe(
                false,
            );
            caller = "admin";
            expect((await actions.addMemorizationMistake(input)).success).toBe(
                false,
            );
            caller = "alice";
            expect(
                (
                    await actions.addMemorizationMistake({
                        ...input,
                        ayahNumber: 100,
                    })
                ).success,
            ).toBe(false);
            const duplicates = await Promise.all([
                actions.addMemorizationMistake(input),
                actions.addMemorizationMistake(input),
            ]);
            expect(duplicates.every((r) => r.success)).toBe(true);
            let [row] = await db.select().from(schema.memorizationMistake);
            expect(row.occurrences).toBe(1);
            expect(
                await db.select().from(schema.memorizationMistakeEvent),
            ).toHaveLength(1);
            const concurrent = await Promise.all([
                actions.addMemorizationMistake({
                    ...input,
                    eventId: crypto.randomUUID(),
                }),
                actions.addMemorizationMistake({
                    ...input,
                    eventId: crypto.randomUUID(),
                }),
            ]);
            expect(concurrent.every((r) => r.success)).toBe(true);
            [row] = await db.select().from(schema.memorizationMistake);
            expect(row.occurrences).toBe(3);
            expect(row.revision).toBe(3);
            caller = "bob";
            expect(
                (
                    await actions.updateMemorizationMistake({
                        id: row.id,
                        revision: row.revision,
                        eventId: crypto.randomUUID(),
                        action: "resolved",
                    })
                ).success,
            ).toBe(false);
            caller = "alice";
            const practise = {
                id: row.id,
                revision: row.revision,
                eventId: crypto.randomUUID(),
                action: "practised",
            };
            expect(
                (await actions.updateMemorizationMistake(practise)).success,
            ).toBe(true);
            expect(
                (await actions.updateMemorizationMistake(practise)).success,
            ).toBe(true);
            [row] = await db.select().from(schema.memorizationMistake);
            expect(row.practiceCount).toBe(1);
            expect(
                (
                    await actions.updateMemorizationMistake({
                        ...practise,
                        eventId: crypto.randomUUID(),
                    })
                ).reason,
            ).toBe("stale");
            const before = await db
                .select()
                .from(schema.memorizationAssessment);
            expect(before).toHaveLength(0);
            // Grid corrections disable notebook practice but retain the entry for future learning.
            await db
                .delete(schema.userMemorizedHizb)
                .where(orm.eq(schema.userMemorizedHizb.userId, "alice"));
            expect(
                (
                    await actions.updateMemorizationMistake({
                        ...practise,
                        revision: row.revision,
                        eventId: crypto.randomUUID(),
                    })
                ).reason,
            ).toBe("unavailable");
            await db
                .insert(schema.userMemorizedHizb)
                .values({ userId: "alice", hizbNumber: 1 });
            expect(
                (
                    await actions.updateMemorizationMistake({
                        id: row.id,
                        revision: row.revision,
                        eventId: crypto.randomUUID(),
                        action: "resolved",
                    })
                ).success,
            ).toBe(true);
            expect(
                (
                    await actions.addMemorizationMistake({
                        ...input,
                        eventId: crypto.randomUUID(),
                    })
                ).success,
            ).toBe(true);
            [row] = await db.select().from(schema.memorizationMistake);
            expect(row.resolvedAt).toBeNull();
            expect(row.occurrences).toBe(4);
            // Real assessment evidence introduces consolidation, without treating baseline as new.
            await db.transaction((tx) =>
                records.recordAssessment(
                    tx,
                    {
                        id: "learn",
                        assigneeId: "alice",
                        riwayah: "hafs",
                        startSurahNumber: 2,
                        startAyahNumber: 9,
                        endSurahNumber: 2,
                        endAyahNumber: 10,
                    },
                    {
                        method: "self",
                        outcome: "confirmed",
                        reviewerId: "alice",
                        sourceKey: "memorization-weekly:learn",
                    },
                ),
            );
            const settings = {
                days: [1, 2, 3, 4],
                quartersPerDay: 1,
                riwayah: "hafs",
                timezone: "UTC",
                reminderTime: null,
            };
            await db.insert(schema.learningSchedule).values({
                userId: "alice",
                revisionDays: settings.days,
                memorizationDays: [1],
            });
            await db
                .insert(schema.revisionPlan)
                .values({ ...settings, userId: "alice", enabled: false });
            await db.insert(schema.revisionWeek).values({
                ...settings,
                id: "week",
                userId: "alice",
                weekStart: "2026-10-05",
            });
            await db.insert(schema.revisionSession).values(
                [1, 2, 3, 4].map((q, i) => ({
                    id: `session-${i}`,
                    userId: "alice",
                    weekId: "week",
                    scheduledDate: `2026-10-0${5 + i}`,
                    ordinal: i,
                    quarters: [q],
                    startSurahNumber: 2,
                    startAyahNumber: q * 2 - 1,
                    endSurahNumber: 2,
                    endAyahNumber: q * 2,
                })),
            );
            const refresh = () =>
                db.transaction(async (tx) => {
                    await records.lockRecord(tx, "alice");
                    await planService.reconcileFollowUpPlan(
                        tx,
                        "alice",
                        new Date("2026-10-05T12:00:00Z"),
                        catalogue,
                    );
                });
            await refresh();
            expect(
                (await db.select().from(schema.revisionSession)).every(
                    (s) => s.reviewAfter === null,
                ),
            ).toBe(true);
            await db
                .update(schema.revisionPlan)
                .set({ enabled: true })
                .where(orm.eq(schema.revisionPlan.userId, "alice"));
            await Promise.all([refresh(), refresh()]);
            const sessions = await db.select().from(schema.revisionSession);
            expect(sessions.find((s) => s.reviewAfter)?.scheduledDate).toBe(
                "2026-10-06",
            );
            expect(sessions.find((s) => s.reviewAfter)?.startAyahNumber).toBe(
                9,
            );
            expect(sessions).toHaveLength(4);
            const stable = sessions.map((s) => s.id).sort();
            await refresh();
            expect(
                (await db.select().from(schema.revisionSession))
                    .map((s) => s.id)
                    .sort(),
            ).toEqual(stable);
            const summary = await report.getWeeklyReport(
                "alice",
                "hafs",
                0,
                new Date("2026-10-05T12:00:00Z"),
            );
            expect(summary.learned).toBe(2);
            expect(summary.reviewed).toBe(0);
            expect(summary.focusedPractices).toBe(1);
            expect(summary.mistakes[0].count).toBe(4);
            expect(summary.followUps).toBe(2);
            const peerEvent = {
                id: "peer",
                assigneeId: "alice",
                riwayah: "warsh",
                startSurahNumber: 2,
                startAyahNumber: 9,
                endSurahNumber: 2,
                endAyahNumber: 10,
            };
            clock.set(new Date("2026-10-06T12:00:00Z"));
            await db.transaction((tx) =>
                records.recordAssessment(tx, peerEvent, {
                    method: "peer",
                    outcome: "confirmed",
                    reviewerId: "bob",
                    sourceKey: "peer:followup",
                }),
            );
            const state = await stateService.retentionState(
                "alice",
                catalogue,
                "UTC",
                new Date("2026-10-06T13:00:00Z"),
            );
            expect(state.followUps.get("a9")).toEqual({
                stage: 1,
                due: "2026-10-09",
            });
            // An authenticated request which raced an admin reset must not repopulate the notebook.
            await db
                .update(schema.user)
                .set({ sessionsRevokedAt: new Date("2026-10-01") })
                .where(orm.eq(schema.user.id, "alice"));
            expect(
                (
                    await actions.addMemorizationMistake({
                        ...input,
                        eventId: crypto.randomUUID(),
                    })
                ).reason,
            ).toBe("unauthorized");
            caller = "bob";
            expect(
                (
                    await actions.addMemorizationMistake({
                        ...input,
                        eventId: crypto.randomUUID(),
                    })
                ).success,
            ).toBe(true);
            await db.delete(schema.user).where(orm.eq(schema.user.id, "alice"));
            expect(
                (await db.select().from(schema.memorizationMistake)).every(
                    (m) => m.userId === "bob",
                ),
            ).toBe(true);
            expect(
                (await db.select().from(schema.memorizationMistakeEvent)).every(
                    (m) => m.userId === "bob",
                ),
            ).toBe(true);
        } finally {
            await pool.end();
        }
    },
    30000,
);
