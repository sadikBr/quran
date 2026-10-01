import { expect, test } from "bun:test";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "../src/drizzle/schema";
import * as subscriptionRules from "../src/features/notifications/push-subscription";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

// Never reads the app's database configuration. Requires an empty throwaway DB.
const target = process.env.SAFETY_TEST_DATABASE_URL;
const run = target ? test : test.skip;

run(
    "database: migrations, concurrent rollover, and session-bound push revocation",
    async () => {
        const url = new URL(target);
        if (!url.pathname.endsWith("_safety_tests"))
            throw new Error(
                "Use an empty disposable database ending in _safety_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        try {
            const existing = await pool.query(
                "select count(*)::int as count from information_schema.tables where table_schema = 'public'",
            );
            if (existing.rows[0].count)
                throw new Error("Refusing a nonempty test database.");
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            await db.insert(schema.user).values([
                { id: "alice", name: "Alice", email: "alice@example.test" },
                { id: "bob", name: "Bob", email: "bob@example.test" },
            ]);
            await db.insert(schema.session).values([
                {
                    id: "session-a",
                    userId: "alice",
                    token: "test-a",
                    expiresAt: new Date(Date.now() + 86400000),
                },
                {
                    id: "session-b",
                    userId: "bob",
                    token: "test-b",
                    expiresAt: new Date(Date.now() + 86400000),
                },
                {
                    id: "expired",
                    userId: "alice",
                    token: "expired",
                    expiresAt: new Date(0),
                },
            ]);
            await db.insert(schema.userWird).values({
                userId: "alice",
                unit: "ayah",
                amount: 10,
                targetStartGlobalAyah: 1,
                targetEndGlobalAyah: 10,
                progressGlobalAyah: 10,
                targetDate: "2026-09-30",
                completedAt: new Date("2026-09-30T12:00:00Z"),
            });
            let release;
            let waiting;
            const gate = new Promise((resolve) => {
                release = resolve;
            });
            const ready = new Promise((resolve) => {
                waiting = resolve;
            });
            let navCalls = 0;
            const get = loadTypeScript(
                "src/features/wird/server/get-daily-wird.ts",
                {
                    "server-only": {},
                    "drizzle-orm": orm,
                    "@/drizzle/db": db,
                    "@/drizzle/schema": schema,
                    "@/features/khatmah/server/calculate-khatmah": {},
                    "@/features/quran/server/get-ayah": async (number) => ({
                        number,
                        surah: {
                            number: 1,
                            name: "surah",
                            englishName: "surah",
                        },
                        numberInSurah: number,
                        page: 1,
                    }),
                    "@/features/quran/server/get-quran-navigation-meta":
                        async () => {
                            if (++navCalls === 1) {
                                waiting();
                                await gate;
                            }
                            return {};
                        },
                    "@/features/quran/server/get-surahs-meta": async () => [],
                    "./build-wird-target": {
                        __esModule: true,
                        TOTAL_QURAN_AYAHS: 6236,
                        default: (_unit, amount, start) => ({
                            startGlobalAyah: start,
                            endGlobalAyah: start + amount - 1,
                        }),
                    },
                    "./wird-date": (date) =>
                        date ? date.toISOString().slice(0, 10) : "2026-10-01",
                },
            ).default;
            const slow = get("alice", "hafs");
            await ready;
            await get("alice", "hafs");
            await db
                .update(schema.userWird)
                .set({ progressGlobalAyah: 15 })
                .where(orm.eq(schema.userWird.userId, "alice"));
            release();
            expect((await slow).progressGlobalAyah).toBe(15);
            // Simultaneous transactions must advance a portion just once.
            await db
                .update(schema.userWird)
                .set({ completedAt: new Date("2026-09-30T12:00:00Z") })
                .where(orm.eq(schema.userWird.userId, "alice"));
            const results = await Promise.all(
                Array.from({ length: 4 }, () => get("alice", "hafs")),
            );
            expect(
                results.every(
                    (value) =>
                        value.start.globalAyahNumber === 21 &&
                        value.end.globalAyahNumber === 30,
                ),
            ).toBe(true);

            const endpoint = "https://fcm.googleapis.com/fcm/send/test";
            const subscription = {
                userId: "alice",
                endpoint,
                keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) },
            };
            await db.insert(schema.pushSubscription).values({
                id: "device",
                userId: "alice",
                sessionId: "session-a",
                endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            });
            const messages = [];
            const sender = loadTypeScript(
                "src/features/notifications/server/web-push.ts",
                {
                    "server-only": {},
                    "drizzle-orm": orm,
                    "web-push": {
                        sendNotification: async (...args) =>
                            messages.push(args),
                    },
                    "@/drizzle/db": db,
                    "@/drizzle/schema": schema,
                    "@/data/env/server": { env: {} },
                    "../push-subscription": subscriptionRules,
                },
            );
            await sender.sendPushNotification(
                subscription,
                '{"title":"Private"}',
            );
            expect(messages).toHaveLength(1);
            // A sender that selected Alice before reassignment must not send to Bob.
            await db
                .update(schema.pushSubscription)
                .set({ userId: "bob", sessionId: "session-b" })
                .where(orm.eq(schema.pushSubscription.id, "device"));
            const staleDeliveryError = await sender
                .sendPushNotification(subscription, "{}")
                .catch((error) => error);
            expect(staleDeliveryError).toBeDefined();
            expect(sender.isExpiredPushSubscription(staleDeliveryError)).toBe(
                false,
            );
            expect(messages).toHaveLength(1);
            await db
                .update(schema.pushSubscription)
                .set({ userId: "alice", sessionId: "expired" })
                .where(orm.eq(schema.pushSubscription.id, "device"));
            await expect(
                sender.sendPushNotification(subscription, "{}"),
            ).rejects.toThrow();
            await db
                .update(schema.pushSubscription)
                .set({ sessionId: null })
                .where(orm.eq(schema.pushSubscription.id, "device"));
            await expect(
                sender.sendPushNotification(subscription, "{}"),
            ).rejects.toThrow();
            await db
                .update(schema.pushSubscription)
                .set({ sessionId: "session-a" })
                .where(orm.eq(schema.pushSubscription.id, "device"));
            await db
                .delete(schema.session)
                .where(orm.eq(schema.session.id, "session-a"));
            expect(
                await db.select().from(schema.pushSubscription),
            ).toHaveLength(0);
            await expect(
                sender.sendPushNotification(subscription, "{}"),
            ).rejects.toThrow();
        } finally {
            await pool.end();
        }
    },
    30000,
);
