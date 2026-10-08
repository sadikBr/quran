import { expect, test } from "bun:test";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "../src/drizzle/schema";
import * as recurrence from "../src/features/plans/recurrence";
import { databaseClock } from "./helpers/database-clock.mjs";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const target = process.env.RECURRING_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: recurring plans isolate owners, preserve history, serialize changes, and deduplicate reminders",
    async () => {
        if (!new URL(target).pathname.endsWith("_recurring_tests"))
            throw new Error(
                "Use an empty disposable database ending in _recurring_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        const clock = databaseClock();
        clock.set(new Date("2026-10-09T12:00:00Z"));
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
            const modules = {
                "server-only": {},
                "drizzle-orm": { ...orm, sql: clock.sql },
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
            };
            const records = loadTypeScript(
                "src/features/memorization/server/record-service.ts",
                {
                    ...modules,
                    "../progress": {},
                    "./get-memory-catalogue": {},
                    "@/features/learning/server/reconcile-plan": {},
                    "@/features/revision/server/reconcile-plan": {},
                },
            );
            const service = loadTypeScript(
                "src/features/plans/server/service.ts",
                {
                    ...modules,
                    "@/features/memorization/server/record-service": records,
                    "../recurrence": recurrence,
                },
            );
            const id = crypto.randomUUID();
            const settings = {
                title: "Al-Kahf",
                notes: "Original notes",
                days: [5],
                timezone: "Africa/Casablanca",
                minutes: 20,
                reminderTime: "13:00",
                surahNumber: 18,
                resourceUrl: null,
            };
            const read = async () =>
                (await service.getRecurringState("owner")).plans.find(
                    (plan) => plan.id === id,
                );
            expect(
                (await service.saveRecurringPlan("owner", id, null, settings))
                    .success,
            ).toBe(true);
            expect((await read()).startDate).toBe("2026-10-09");
            expect(
                (await service.saveRecurringPlan("owner", id, null, settings))
                    .success,
            ).toBe(false);
            expect(
                (await service.getRecurringState("other")).plans,
            ).toHaveLength(0);
            expect(
                (await service.saveRecurringPlan("other", id, 1, settings))
                    .success,
            ).toBe(false);
            expect(
                (await service.changeRecurringPlan("other", id, 1, "archive"))
                    .success,
            ).toBe(false);
            expect(
                (
                    await service.recordRecurringOccurrence(
                        "other",
                        id,
                        1,
                        "2026-10-09",
                        "completed",
                    )
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.recordRecurringOccurrence(
                        "owner",
                        id,
                        1,
                        "2026-10-16",
                        "completed",
                    )
                ).reason,
            ).toBe("date");
            expect(
                (
                    await service.recordRecurringOccurrence(
                        "owner",
                        id,
                        1,
                        "2026-10-08",
                        "completed",
                    )
                ).reason,
            ).toBe("date");
            const concurrent = await Promise.all([
                service.recordRecurringOccurrence(
                    "owner",
                    id,
                    1,
                    "2026-10-09",
                    "completed",
                ),
                service.recordRecurringOccurrence(
                    "owner",
                    id,
                    1,
                    "2026-10-09",
                    "skipped",
                ),
            ]);
            expect(concurrent.filter((result) => result.success)).toHaveLength(
                1,
            );
            expect(
                (await service.getRecurringState("owner")).occurrences,
            ).toHaveLength(1);
            expect(
                (await service.saveRecurringPlan("owner", id, 1, settings))
                    .reason,
            ).toBe("stale");
            expect(
                (
                    await service.recordRecurringOccurrence(
                        "owner",
                        id,
                        2,
                        "2026-10-09",
                        "pending",
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.recordRecurringOccurrence(
                        "owner",
                        id,
                        3,
                        "2026-10-09",
                        "completed",
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.saveRecurringPlan("owner", id, 4, {
                        ...settings,
                        title: "Renamed",
                        minutes: 30,
                    })
                ).success,
            ).toBe(true);
            const history = (await service.getRecurringState("owner"))
                .occurrences;
            expect(history[0].snapshot.title).toBe("Al-Kahf");
            expect(history[0].snapshot.minutes).toBe(20);
            expect(
                await db.select().from(schema.memorizationAssessment),
            ).toHaveLength(0);
            clock.set(new Date("2026-10-16T12:00:00Z"));
            expect(
                (
                    await service.recordRecurringOccurrence(
                        "owner",
                        id,
                        5,
                        "2026-10-09",
                        "pending",
                    )
                ).reason,
            ).toBe("date");
            expect(
                recurrence.recurringPlanningTasks(
                    await service.getRecurringState("owner"),
                    null,
                    {},
                    new Date("2026-10-16T12:00:00Z"),
                )[0].done,
            ).toBe(false);
            expect(
                (await service.changeRecurringPlan("owner", id, 5, "pause"))
                    .success,
            ).toBe(true);
            expect(
                (
                    await service.recordRecurringOccurrence(
                        "owner",
                        id,
                        6,
                        "2026-10-16",
                        "completed",
                    )
                ).success,
            ).toBe(false);
            expect(
                (await service.changeRecurringPlan("owner", id, 6, "resume"))
                    .success,
            ).toBe(true);

            // Delivery is stubbed; no push messages leave this test database.
            await db.insert(schema.pushSubscription).values(
                ["device-1", "device-2"].map((id) => ({
                    id,
                    userId: "owner",
                    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
                    p256dh: "test",
                    auth: "test",
                })),
            );
            let sent = 0,
                shouldFail = false;
            const reminders = loadTypeScript(
                "src/features/plans/server/reminders.ts",
                {
                    ...modules,
                    "../recurrence": recurrence,
                    "@/features/notifications/server/web-push": {
                        sendPushNotification: async () => {
                            if (shouldFail)
                                throw new Error("Temporary failure");
                            sent++;
                        },
                        isExpiredPushSubscription: () => false,
                    },
                },
            );
            const now = new Date("2026-10-16T12:00:00Z");
            const deliveries = await Promise.all([
                reminders.sendRecurringReminders(now),
                reminders.sendRecurringReminders(now),
            ]);
            expect(
                deliveries.reduce((count, result) => count + result.sent, 0),
            ).toBe(2);
            expect(sent).toBe(2);
            expect((await reminders.sendRecurringReminders(now)).sent).toBe(0);
            expect(
                (
                    await service.recordRecurringOccurrence(
                        "owner",
                        id,
                        7,
                        "2026-10-16",
                        "skipped",
                    )
                ).success,
            ).toBe(true);
            expect((await reminders.sendRecurringReminders(now)).sent).toBe(0);
            clock.set(new Date("2026-10-23T12:00:00Z"));
            shouldFail = true;
            expect(
                (
                    await reminders.sendRecurringReminders(
                        new Date("2026-10-23T12:00:00Z"),
                    )
                ).failed,
            ).toBe(2);
            shouldFail = false;
            expect(
                (
                    await reminders.sendRecurringReminders(
                        new Date("2026-10-23T12:01:00Z"),
                    )
                ).sent,
            ).toBe(2);
            expect(
                (await service.changeRecurringPlan("owner", id, 8, "archive"))
                    .success,
            ).toBe(true);
            expect(
                (await service.getRecurringState("owner")).occurrences,
            ).toHaveLength(2);
            expect(
                (await service.getRecurringState("other")).occurrences,
            ).toHaveLength(0);
            expect(
                (
                    await reminders.sendRecurringReminders(
                        new Date("2026-10-30T12:00:00Z"),
                    )
                ).sent,
            ).toBe(0);
            expect(
                (await service.changeRecurringPlan("owner", id, 9, "resume"))
                    .success,
            ).toBe(false);
            await db
                .delete(schema.recurringPlan)
                .where(orm.eq(schema.recurringPlan.userId, "owner"));
            expect(
                await db.select().from(schema.recurringOccurrence),
            ).toHaveLength(0);
            expect(
                await db.select().from(schema.recurringReminderDelivery),
            ).toHaveLength(0);
        } finally {
            await pool.end();
        }
    },
    30000,
);
