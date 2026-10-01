import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DateTime } from "luxon";
import pg from "pg";
import { z } from "zod";
import * as schema from "../src/drizzle/schema";
import * as progress from "../src/features/memorization/progress";
import { quranReferenceSchema } from "../src/features/practice/types";
import * as schedule from "../src/features/revision/schedule";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const target = process.env.REVISION_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: opt-in, stable weeks, isolated progress, peer coverage, corrections, rollover and reminders",
    async () => {
        if (!new URL(target).pathname.endsWith("_revision_tests"))
            throw new Error(
                "Use an empty disposable database ending in _revision_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        try {
            const existing = await pool.query(
                "select count(*)::int as count from information_schema.tables where table_schema='public'",
            );
            if (existing.rows[0].count)
                throw new Error("Refusing a nonempty test database.");
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            const ids = [
                "solo",
                "peer",
                "other",
                "empty",
                "new",
                "correct",
                "rollover",
                "notify",
                "admin",
            ];
            await db.insert(schema.user).values(
                ids.map((id) => ({
                    id,
                    name: id,
                    email: `${id}@example.test`,
                    role: id === "admin" ? "admin" : "member",
                })),
            );
            const verses = Array.from({ length: 48 }, (_, i) => ({
                surahNumber: 2,
                ayahNumber: i + 1,
                hizb: Math.ceil((i + 1) / 8),
                quarter: Math.ceil((i + 1) / 2),
                page: 1,
                atoms: [`a${i + 1}`],
            }));
            const catalogue = {
                hafs: verses,
                warsh: verses.map((v) => ({ ...v })),
            };
            const modules = {
                "server-only": {},
                "drizzle-orm": orm,
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
            };
            const records = loadTypeScript(
                "src/features/memorization/server/record-service.ts",
                { ...modules, "../progress": progress },
            );
            const service = loadTypeScript(
                "src/features/revision/server/service.ts",
                {
                    ...modules,
                    "node:crypto": { createHash },
                    luxon: { DateTime },
                    "@/features/memorization/progress": progress,
                    "@/features/memorization/server/get-memory-catalogue":
                        async () => catalogue,
                    "@/features/memorization/server/record-service": records,
                    "../schedule": schedule,
                },
            );
            const settings = {
                days: [1, 2, 3, 4, 5, 6, 7],
                quartersPerDay: 4,
                timezone: "UTC",
                riwayah: "hafs",
                reminderTime: null,
            };
            for (const id of ids.filter((i) => i !== "new"))
                expect(
                    (
                        await records.saveBaseline(
                            id,
                            {
                                hizbs: id === "empty" ? [] : [1, 3, 6],
                                revision: 0,
                                setup: true,
                            },
                            "hafs",
                        )
                    ).success,
                ).toBe(true);
            const activate = async (id, config = settings) => {
                const preview = await service.previewRevisionPlan(id, config);
                expect(
                    (await service.saveRevisionPlan(id, config, preview.key))
                        .success,
                ).toBe(true);
                return service.getRevisionView(id);
            };
            const events = (id) =>
                db
                    .select()
                    .from(schema.memorizationAssessment)
                    .where(orm.eq(schema.memorizationAssessment.userId, id));
            const viewBefore = await service.getRevisionView("solo");
            expect(viewBefore.plan).toBeNull();
            expect(viewBefore.sessions).toEqual([]);
            for (const id of ["new", "empty"]) {
                const preview = await service.previewRevisionPlan(id, settings);
                expect(preview.ready).toBe(false);
                expect(
                    (await service.saveRevisionPlan(id, settings, preview.key))
                        .success,
                ).toBe(false);
            }
            const preview = await service.previewRevisionPlan("solo", settings);
            expect(await db.select().from(schema.revisionWeek)).toHaveLength(0);
            const results = await Promise.all(
                [1, 2].map(() =>
                    service.saveRevisionPlan("solo", settings, preview.key),
                ),
            );
            expect(results.filter((r) => r.success)).toHaveLength(1);
            let solo = await service.getRevisionView("solo");
            expect(solo.sessions).toHaveLength(preview.sessions.length);
            expect(await db.select().from(schema.revisionWeek)).toHaveLength(1);
            const first = solo.sessions[0];
            const initialIds = solo.sessions.map((s) => s.id);
            const changed = {
                ...settings,
                quartersPerDay: 1,
                days: [1],
                riwayah: "warsh",
                timezone: "Asia/Tokyo",
            };
            const next = await service.previewRevisionPlan("solo", changed);
            expect(next.nextWeek).toBe(true);
            expect(next.weekStart).toBe(
                DateTime.fromISO(solo.week.weekStart)
                    .plus({ weeks: 1 })
                    .toISODate(),
            );
            expect(
                (await service.saveRevisionPlan("solo", changed, next.key))
                    .success,
            ).toBe(true);
            solo = await service.getRevisionView("solo");
            expect(solo.sessions.map((s) => s.id)).toEqual(initialIds);
            expect(solo.week.riwayah).toBe("hafs");
            expect(solo.week.timezone).toBe("UTC");
            expect(solo.plan.riwayah).toBe("warsh");
            expect(
                (await service.saveRevisionPlan("solo", changed, next.key))
                    .reason,
            ).toBe("stale");
            expect(
                (
                    await service.updateRevisionSession("other", first.id, {
                        surahNumber: 2,
                        ayahNumber: 8,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.updateRevisionSession("solo", first.id, {
                        surahNumber: 2,
                        ayahNumber: 40,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.updateRevisionSession("solo", first.id, {
                        outcome: "comfortable",
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.updateRevisionSession("solo", first.id, {
                        surahNumber: first.endSurahNumber,
                        ayahNumber: first.endAyahNumber,
                    })
                ).success,
            ).toBe(true);
            expect(await events("solo")).toHaveLength(0);
            const finishes = await Promise.all(
                [1, 2].map(() =>
                    service.updateRevisionSession("solo", first.id, {
                        outcome: "difficult",
                    }),
                ),
            );
            expect(finishes.filter((r) => r.success)).toHaveLength(1);
            expect(await events("solo")).toHaveLength(1);
            solo = await service.getRevisionView("solo");
            expect(solo.completedHizbs).toBe(3);
            expect(solo.sessions[0].done).toBe(true);
            expect(solo.sessions[0].outcome).toBe("difficult");
            expect(
                await db.select().from(schema.practiceAssignment),
            ).toHaveLength(0);
            expect((await service.pauseRevisionPlan("solo", 1)).success).toBe(
                false,
            );
            expect(
                (await service.pauseRevisionPlan("solo", solo.plan.revision))
                    .success,
            ).toBe(true);
            expect((await service.getRevisionView("solo")).plan.enabled).toBe(
                false,
            );
            expect(
                (
                    await service.updateRevisionSession("solo", first.id, {
                        surahNumber: 2,
                        ayahNumber: 1,
                    })
                ).success,
            ).toBe(false);
            await activate("solo", changed);
            expect(
                (await service.getRevisionView("solo")).sessions.map(
                    (s) => s.id,
                ),
            ).toEqual(initialIds);

            // Group reviews cover only matching ayahs; self completion preserves gaps.
            let peer = await activate("peer");
            const part = peer.sessions[0];
            const assessment = (start, end, extra = {}) => ({
                id: crypto.randomUUID(),
                userId: "peer",
                assignmentId: "group-review",
                sourceKey: crypto.randomUUID(),
                method: "peer",
                outcome: "confirmed",
                reviewerId: "other",
                riwayah: "hafs",
                startSurahNumber: 2,
                startAyahNumber: start,
                endSurahNumber: 2,
                endAyahNumber: end,
                ...extra,
            });
            await db
                .insert(schema.memorizationAssessment)
                .values([assessment(2, 3), assessment(7, 8)]);
            peer = await service.getRevisionView("peer");
            expect(peer.sessions[0].remaining).toEqual([
                "2:1",
                "2:4",
                "2:5",
                "2:6",
            ]);
            expect(peer.sessions[0].peer).toBe(4);
            expect(peer.sessions[0].done).toBe(false);
            await service.updateRevisionSession("peer", part.id, {
                surahNumber: 2,
                ayahNumber: 6,
            });
            expect(
                (
                    await service.updateRevisionSession("peer", part.id, {
                        outcome: "comfortable",
                    })
                ).success,
            ).toBe(true);
            const self = (await events("peer")).filter(
                (e) => e.method === "self",
            );
            expect(
                self
                    .map((e) => [e.startAyahNumber, e.endAyahNumber])
                    .sort((a, b) => a[0] - b[0]),
            ).toEqual([
                [1, 1],
                [4, 6],
            ]);
            const other = await activate("other");
            await db
                .insert(schema.memorizationAssessment)
                .values(assessment(1, 8, { userId: "other" }));
            expect(
                (await service.getRevisionView("other")).sessions[0].done,
            ).toBe(true);
            expect(
                (
                    await service.updateRevisionSession(
                        "other",
                        other.sessions[0].id,
                        { outcome: "comfortable" },
                    )
                ).success,
            ).toBe(true);
            expect(await events("other")).toHaveLength(1);

            // A baseline correction invalidates unrevised ranges and stale previews.
            const correct = await activate("correct");
            const stale = await service.previewRevisionPlan("correct", changed);
            await records.saveBaseline(
                "correct",
                { hizbs: [], revision: 1, setup: false },
                "hafs",
            );
            expect(
                (await service.saveRevisionPlan("correct", changed, stale.key))
                    .reason,
            ).toBe("stale");
            expect(
                (await service.getRevisionView("correct")).sessions.every(
                    (s) => !s.available,
                ),
            ).toBe(true);
            expect(
                (
                    await service.updateRevisionSession(
                        "correct",
                        correct.sessions[0].id,
                        { surahNumber: 2, ayahNumber: 8 },
                    )
                ).success,
            ).toBe(false);

            // Lazy rollover makes only the current week, with no accumulated daily workload.
            const old = await activate("rollover");
            await pool.query(
                "update revision_week set week_start=week_start-28 where user_id='rollover'",
            );
            await pool.query(
                "update revision_session set scheduled_date=scheduled_date-28 where user_id='rollover'",
            );
            const rolled = await Promise.all(
                [1, 2].map(() => service.getRevisionView("rollover")),
            );
            expect(rolled[0].week.id).toBe(rolled[1].week.id);
            expect(rolled[0].week.id).not.toBe(old.week.id);
            expect(
                rolled[0].sessions.flatMap((s) => s.quarters).length,
            ).toBeLessThanOrEqual(7 * 4);
            expect(
                await db
                    .select()
                    .from(schema.revisionWeek)
                    .where(orm.eq(schema.revisionWeek.userId, "rollover")),
            ).toHaveLength(2);
            expect(
                (
                    await service.updateRevisionSession(
                        "rollover",
                        old.sessions[0].id,
                        { surahNumber: 2, ayahNumber: 8 },
                    )
                ).success,
            ).toBe(false);

            // Authenticated actions reject missing consent, malformed input and administrative accounts.
            let userId = null;
            const actions = loadTypeScript(
                "src/features/revision/server/actions.ts",
                {
                    zod: { z },
                    "next/cache": { revalidatePath() {} },
                    "next/headers": { headers: async () => new Headers() },
                    "@/features/auth/auth": {
                        auth: {
                            api: {
                                getSession: async () =>
                                    userId ? { user: { id: userId } } : null,
                            },
                        },
                    },
                    "@/features/auth/permissions": {
                        isPlatformAdmin: async (id) => id === "admin",
                    },
                    "@/features/practice/types": { quranReferenceSchema },
                    "../schedule": schedule,
                    "./service": service,
                },
            );
            expect(
                (await actions.previewWeeklyRevision(settings)).success,
            ).toBe(false);
            userId = "admin";
            expect(
                (await actions.previewWeeklyRevision(settings)).success,
            ).toBe(false);
            userId = "solo";
            expect(
                (await actions.previewWeeklyRevision({ ...settings, days: [] }))
                    .success,
            ).toBe(false);
            expect(
                (await actions.saveWeeklyRevision({ settings, key: next.key }))
                    .success,
            ).toBe(false);
            expect(
                (
                    await actions.finishWeeklyRevision({
                        sessionId: first.id,
                        outcome: "comfortable",
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.saveWeeklyRevisionProgress({
                        assignmentId: part.id,
                        surahNumber: 2,
                        ayahNumber: 6,
                    })
                ).success,
            ).toBe(false);

            // Stub only the external delivery. Real claims and plans enforce opt-in and deduplication.
            const notificationTime = DateTime.utc().startOf("minute");
            const notify = await activate("notify", {
                ...settings,
                reminderTime: notificationTime.toFormat("HH:mm"),
            });
            await db
                .insert(schema.userSettings)
                .values({ userId: "notify", language: "en" });
            await db.insert(schema.pushSubscription).values({
                id: "device",
                userId: "notify",
                endpoint: "https://example.test/push",
                p256dh: "test",
                auth: "test",
            });
            let sent = 0;
            const reminders = loadTypeScript(
                "src/features/revision/server/reminders.ts",
                {
                    ...modules,
                    "../schedule": schedule,
                    "./service": service,
                    "@/features/notifications/server/web-push": {
                        isExpiredPushSubscription: () => false,
                        sendPushNotification: async (_sub, payload) => {
                            expect(JSON.parse(payload).url).toBe(
                                "/memorization/revision",
                            );
                            sent++;
                        },
                    },
                },
            );
            await Promise.all(
                [1, 2].map(() =>
                    reminders.sendRevisionReminders(
                        notificationTime.toJSDate(),
                    ),
                ),
            );
            expect(sent).toBe(1);
            await reminders.sendRevisionReminders(
                notificationTime.plus({ minutes: 5 }).toJSDate(),
            );
            expect(sent).toBe(1);
            await db.delete(schema.revisionReminderDelivery);
            await service.pauseRevisionPlan("notify", notify.plan.revision);
            await reminders.sendRevisionReminders(notificationTime.toJSDate());
            expect(sent).toBe(1);
            await activate("notify", {
                ...settings,
                reminderTime: notificationTime.toFormat("HH:mm"),
            });
            const today = notify.sessions.filter(
                (s) => s.scheduledDate === notificationTime.toISODate(),
            );
            for (const s of today)
                await db.insert(schema.memorizationAssessment).values(
                    assessment(s.startAyahNumber, s.endAyahNumber, {
                        userId: "notify",
                    }),
                );
            await reminders.sendRevisionReminders(notificationTime.toJSDate());
            expect(sent).toBe(1);
        } finally {
            await pool.end();
        }
    },
    30000,
);
