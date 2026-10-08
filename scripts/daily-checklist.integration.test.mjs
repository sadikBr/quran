import { expect, test } from "bun:test";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as luxon from "luxon";
import pg from "pg";
import * as schema from "../src/drizzle/schema";
import * as checklist from "../src/features/plans/daily-checklist";
import * as preferences from "../src/features/settings/preferences";
import { databaseClock } from "./helpers/database-clock.mjs";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const target = process.env.CHECKLIST_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: daily checklist persists per account, serializes changes, resets by local day, and includes completed assignments",
    async () => {
        if (!new URL(target).pathname.endsWith("_checklist_tests"))
            throw new Error(
                "Use an empty disposable database ending in _checklist_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        const clock = databaseClock();
        let now = new Date("2026-10-08T22:30:00Z");
        clock.set(now);
        try {
            const tables = await pool.query(
                "select count(*)::int as count from information_schema.tables where table_schema='public'",
            );
            if (tables.rows[0].count)
                throw new Error("Refusing a nonempty test database.");
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            await db.insert(schema.user).values([
                { id: "owner", name: "Owner", email: "owner@example.test" },
                { id: "other", name: "Other", email: "other@example.test" },
                {
                    id: "admin",
                    name: "Admin",
                    email: "admin@example.test",
                    role: "admin",
                },
                {
                    id: "suspended",
                    name: "Suspended",
                    email: "suspended@example.test",
                    suspendedAt: now,
                },
            ]);
            const modules = {
                "server-only": {},
                "drizzle-orm": { ...orm, sql: clock.sql },
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
            };
            const service = loadTypeScript(
                "src/features/plans/server/daily-checklist-service.ts",
                {
                    ...modules,
                    "@/features/settings/preferences": preferences,
                    "../daily-checklist": checklist,
                },
            );
            const read = (user = "owner", zone = "Africa/Casablanca") =>
                service.getDailyChecklistState(user, zone, now);
            const initial = await read();
            expect(initial.settings.visible).toEqual([
                ...checklist.CHECKLIST_CHOICES,
            ]);
            expect(
                initial.adhkar.every(
                    (item) => !item.completed && item.revision === 0,
                ),
            ).toBe(true);
            const choices = await Promise.all([
                service.saveChecklistSettings("owner", {
                    ...initial.settings,
                    visible: [],
                }),
                service.saveChecklistSettings("owner", {
                    ...initial.settings,
                    visible: ["wird"],
                }),
            ]);
            expect(choices.filter((result) => result.success)).toHaveLength(1);
            expect((await read()).settings.revision).toBe(1);
            expect((await read("other")).settings.revision).toBe(0);
            const completion = { ...initial.adhkar[0], completed: true };
            const concurrent = await Promise.all([
                service.recordDailyAdhkar("owner", completion),
                service.recordDailyAdhkar("owner", completion),
            ]);
            expect(concurrent.filter((result) => result.success)).toHaveLength(
                1,
            );
            expect((await read()).adhkar[0].completed).toBe(true);
            expect((await read("other")).adhkar[0].completed).toBe(false);
            expect((await read()).adhkar[1].completed).toBe(false);
            expect(
                (await service.recordDailyAdhkar("owner", completion)).reason,
            ).toBe("stale");
            const latest = await read();
            expect(
                (
                    await service.saveChecklistSettings("owner", {
                        ...latest.settings,
                        visible: [],
                    })
                ).success,
            ).toBe(true);
            expect((await read()).adhkar[0].completed).toBe(true);
            expect(
                (
                    await service.recordDailyAdhkar("owner", {
                        ...latest.adhkar[0],
                        completed: false,
                    })
                ).success,
            ).toBe(true);
            expect((await read()).adhkar[0].completed).toBe(false);
            for (const userId of ["admin", "suspended", "missing"]) {
                expect(
                    (await service.recordDailyAdhkar(userId, completion))
                        .success,
                ).toBe(false);
                expect(
                    (
                        await service.saveChecklistSettings(
                            userId,
                            initial.settings,
                        )
                    ).success,
                ).toBe(false);
            }
            // Advancing across Casablanca midnight creates a fresh daily checklist.
            const yesterday = (await read()).adhkar[0];
            now = new Date("2026-10-08T23:30:00Z");
            clock.set(now);
            expect(
                (
                    await service.recordDailyAdhkar("owner", {
                        ...yesterday,
                        completed: true,
                    })
                ).reason,
            ).toBe("date");
            const tomorrow = await read();
            expect(tomorrow.date).toBe("2026-10-09");
            expect(tomorrow.adhkar[0].revision).toBe(0);
            expect(tomorrow.adhkar[0].completed).toBe(false);
            expect(tomorrow.settings.visible).toEqual([]);
            expect(
                (
                    await service.recordDailyAdhkar("owner", {
                        ...tomorrow.adhkar[0],
                        timezone: "UTC",
                        completed: true,
                    })
                ).reason,
            ).toBe("date");
            expect(
                (
                    await service.recordDailyAdhkar("owner", {
                        ...tomorrow.adhkar[0],
                        completed: true,
                    })
                ).success,
            ).toBe(true);
            // An administrative data reset must invalidate forms from earlier tabs.
            await db.transaction(async (tx) => {
                await tx
                    .update(schema.user)
                    .set({ dataResetAt: now })
                    .where(orm.eq(schema.user.id, "owner"));
                await tx
                    .delete(schema.dailyChecklistSettings)
                    .where(
                        orm.eq(schema.dailyChecklistSettings.userId, "owner"),
                    );
                await tx
                    .delete(schema.dailyAdhkarCompletion)
                    .where(
                        orm.eq(schema.dailyAdhkarCompletion.userId, "owner"),
                    );
            });
            expect(
                (
                    await service.recordDailyAdhkar("owner", {
                        ...tomorrow.adhkar[1],
                        completed: true,
                    })
                ).reason,
            ).toBe("stale");
            expect(
                (await service.saveChecklistSettings("owner", initial.settings))
                    .reason,
            ).toBe("stale");
            const reset = await read();
            expect(reset.settings.visible).toEqual([
                ...checklist.CHECKLIST_CHOICES,
            ]);
            expect(
                (
                    await service.recordDailyAdhkar("owner", {
                        ...reset.adhkar[1],
                        completed: true,
                    })
                ).success,
            ).toBe(true);

            const assignments = loadTypeScript(
                "src/features/practice/server/get-practice-assignment.ts",
                { ...modules, luxon },
            );
            const base = {
                assigneeId: "owner",
                assignedById: "owner",
                kind: "memorization",
                riwayah: "hafs",
                startSurahNumber: 112,
                startAyahNumber: 1,
                endSurahNumber: 112,
                endAyahNumber: 4,
            };
            await db.insert(schema.practiceAssignment).values([
                { ...base, id: "pending" },
                {
                    ...base,
                    id: "submitted",
                    status: "submitted",
                    submittedAt: now,
                },
                {
                    ...base,
                    id: "completed",
                    status: "completed",
                    reviewedAt: now,
                },
                {
                    ...base,
                    id: "old",
                    status: "completed",
                    reviewedAt: new Date("2026-10-05T12:00:00Z"),
                },
                {
                    ...base,
                    id: "early",
                    status: "completed",
                    plannedDate: "2026-10-09",
                    reviewedAt: new Date("2026-10-05T12:00:00Z"),
                },
                {
                    ...base,
                    id: "another-owner",
                    assigneeId: "other",
                    status: "completed",
                    reviewedAt: now,
                },
            ]);
            const found = await assignments.getChecklistPracticeAssignments(
                "owner",
                "2026-10-09",
                "Africa/Casablanca",
            );
            expect(found.map((item) => item.id).sort()).toEqual([
                "completed",
                "early",
                "pending",
                "submitted",
            ]);
            expect(
                (
                    await assignments.getChecklistPracticeAssignments(
                        "owner",
                        "2026-10-08",
                        "UTC",
                    )
                ).some((item) => item.id === "completed"),
            ).toBe(true);
            await db.delete(schema.user).where(orm.eq(schema.user.id, "owner"));
            expect(
                await db.select().from(schema.dailyAdhkarCompletion),
            ).toHaveLength(0);
            expect(
                await db.select().from(schema.dailyChecklistSettings),
            ).toHaveLength(0);
        } finally {
            await pool.end();
        }
    },
    30000,
);
