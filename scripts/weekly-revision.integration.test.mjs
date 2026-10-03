import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DateTime } from "luxon";
import pg from "pg";
import { z } from "zod";
import * as schema from "../src/drizzle/schema";
import * as carry from "../src/features/learning/carry-forward";
import * as progress from "../src/features/memorization/progress";
import { quranReferenceSchema } from "../src/features/practice/types";
import * as rotation from "../src/features/revision/rotation";
import * as schedule from "../src/features/revision/schedule";
import { databaseClock } from "./helpers/database-clock.mjs";
import { loadMemorizationReconciliation } from "./helpers/load-memorization-reconciliation.mjs";
import { loadRetention } from "./helpers/load-retention.mjs";
import { loadRevisionReconciliation } from "./helpers/load-revision-reconciliation.mjs";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const target = process.env.REVISION_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: opt-in, carried schedules, isolated progress, peer coverage, corrections, rollover and reminders",
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
                "carry",
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
            const testClock = databaseClock();
            const modules = {
                "server-only": {},
                "drizzle-orm": { ...orm, sql: testClock.sql },
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
            };
            const lifecycle = loadTypeScript(
                "src/features/learning/server/plan-lifecycle.ts",
                {
                    ...modules,
                    "node:crypto": { createHash },
                    luxon: { DateTime },
                },
            );
            const reconciliation = loadRevisionReconciliation(
                modules,
                async () => catalogue,
            );
            const memorizationReconciliation = loadMemorizationReconciliation(
                modules,
                async () => catalogue,
            );
            const records = loadTypeScript(
                "src/features/memorization/server/record-service.ts",
                {
                    ...modules,
                    "../progress": progress,
                    "@/features/learning/server/reconcile-plan":
                        memorizationReconciliation,
                    "@/features/revision/server/reconcile-plan": reconciliation,
                    "./get-memory-catalogue": async () => catalogue,
                },
            );
            const service = loadTypeScript(
                "src/features/revision/server/service.ts",
                {
                    ...modules,
                    ...loadRetention(modules),
                    "node:crypto": { createHash },
                    luxon: { DateTime },
                    "@/features/memorization/progress": progress,
                    "@/features/learning/carry-forward": carry,
                    "@/features/learning/server/plan-lifecycle": lifecycle,
                    "@/features/memorization/server/get-memory-catalogue":
                        async () => catalogue,
                    "@/features/memorization/server/record-service": records,
                    "../schedule": schedule,
                    "./reconcile-plan": reconciliation,
                    "../rotation": rotation,
                },
            );
            await db.insert(schema.learningSchedule).values(
                ids.map((userId) => ({
                    userId,
                    revisionDays: [1, 2, 3, 4, 5, 6, 7],
                    memorizationDays: [1, 3, 5],
                })),
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
            // A valid owned session still cannot be opened or written before its study day.
            testClock.set(
                DateTime.fromISO(first.scheduledDate, { zone: "UTC" })
                    .minus({ days: 1 })
                    .set({ hour: 12 })
                    .toJSDate(),
            );
            expect(
                (await service.getRevisionView("solo")).sessions.every(
                    (s) => !s.active,
                ),
            ).toBe(true);
            expect(
                (
                    await service.updateRevisionSession("solo", first.id, {
                        surahNumber: first.endSurahNumber,
                        ayahNumber: first.endAyahNumber,
                    })
                ).reason,
            ).toBe("inactive");
            expect(
                (
                    await service.updateRevisionSession("solo", first.id, {
                        outcome: "comfortable",
                    })
                ).reason,
            ).toBe("inactive");
            testClock.set(null);

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
            ).toBe(false);
            expect(await events("other")).toHaveLength(1);

            // A baseline correction removes invalid sessions atomically and invalidates previews.
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
                await db
                    .select()
                    .from(schema.revisionSession)
                    .where(orm.eq(schema.revisionSession.userId, "correct")),
            ).toEqual([]);
            expect((await service.getRevisionView("correct")).sessions).toEqual(
                [],
            );
            expect(
                (
                    await service.updateRevisionSession(
                        "correct",
                        correct.sessions[0].id,
                        { surahNumber: 2, ayahNumber: 8 },
                    )
                ).success,
            ).toBe(false);

            // Missed daily portions move together, preserving IDs and partial circle credit.
            const carried = await activate("carry");
            const carriedFirst = carried.sessions[0];
            if (carried.sessions.length === 1) {
                await db.insert(schema.revisionSession).values({
                    id: "carry-later",
                    userId: "carry",
                    weekId: carried.week.id,
                    scheduledDate: DateTime.fromISO(carriedFirst.scheduledDate)
                        .plus({ days: 1 })
                        .toISODate(),
                    ordinal: 1,
                    quarters: [9, 10, 11, 12],
                    startSurahNumber: 2,
                    startAyahNumber: 17,
                    endSurahNumber: 2,
                    endAyahNumber: 24,
                });
            }
            await pool.query(
                "update revision_session set scheduled_date=scheduled_date-1 where user_id='carry'",
            );
            await db
                .insert(schema.memorizationAssessment)
                .values(
                    assessment(
                        carriedFirst.startAyahNumber,
                        carriedFirst.startAyahNumber,
                        { userId: "carry" },
                    ),
                );
            await service.updateRevisionSession("carry", carriedFirst.id, {
                surahNumber: carriedFirst.startSurahNumber,
                ayahNumber: carriedFirst.startAyahNumber + 1,
            });
            const shifted = await service.getRevisionView("carry");
            expect(shifted.sessions[0].id).toBe(carriedFirst.id);
            expect(shifted.sessions[0].scheduledDate).toBe(shifted.today);
            expect(
                shifted.sessions[0].originalScheduledDate < shifted.today,
            ).toBe(true);
            expect(shifted.sessions[0].peer).toBe(1);
            expect(shifted.sessions[0].progressAyahNumber).toBe(
                carriedFirst.startAyahNumber + 1,
            );
            expect(shifted.sessions[1].scheduledDate).toBe(
                DateTime.fromISO(shifted.today).plus({ days: 1 }).toISODate(),
            );
            await service.updateRevisionSession("carry", carriedFirst.id, {
                surahNumber: carriedFirst.endSurahNumber,
                ayahNumber: carriedFirst.endAyahNumber,
            });
            await service.updateRevisionSession("carry", carriedFirst.id, {
                outcome: "comfortable",
            });
            const afterFinish = await service.getRevisionView("carry");
            expect(afterFinish.sessions[1].scheduledDate).toBe(
                shifted.sessions[1].scheduledDate,
            );
            expect(
                afterFinish.sessions.filter(
                    (s) => s.scheduledDate === afterFinish.today && !s.done,
                ),
            ).toHaveLength(0);

            // The latest unfinished queue crosses weeks without replacement or accumulated workload.
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
            expect(rolled[0].week.id).toBe(old.week.id);
            expect(rolled[0].sessions.map((s) => s.id)).toEqual(
                old.sessions.map((s) => s.id),
            );
            expect(rolled[0].sessions[0].scheduledDate).toBe(rolled[0].today);
            expect(
                rolled[0].sessions.flatMap((s) => s.quarters).length,
            ).toBeLessThanOrEqual(7 * 4);
            expect(
                await db
                    .select()
                    .from(schema.revisionWeek)
                    .where(orm.eq(schema.revisionWeek.userId, "rollover")),
            ).toHaveLength(1);
            expect(
                (
                    await service.updateRevisionSession(
                        "rollover",
                        old.sessions[0].id,
                        { surahNumber: 2, ayahNumber: 8 },
                    )
                ).success,
            ).toBe(true);
            // Circle credit from the original week and a later week both remain attached.
            const originalCreditDate = DateTime.fromISO(
                rolled[0].week.weekStart,
                { zone: "UTC" },
            )
                .plus({ days: 1 })
                .toJSDate();
            await db.insert(schema.memorizationAssessment).values([
                assessment(1, 1, {
                    userId: "rollover",
                    createdAt: originalCreditDate,
                }),
                assessment(2, 2, { userId: "rollover" }),
            ]);
            const credited = await service.getRevisionView("rollover");
            expect(credited.sessions[0].peer).toBe(2);
            expect(credited.sessions[0].progressAyahNumber).toBe(8);
            expect(credited.sessions[0].remaining).not.toContain("2:1");
            expect(credited.sessions[0].remaining).not.toContain("2:2");
            let studyDay = DateTime.utc();
            // Unstarted portions may adapt after a review introduces a follow-up.
            // Re-open the day's current queue, as the reader does, before saving.
            for (const _ of new Set(
                credited.sessions.map((s) => s.scheduledDate),
            )) {
                testClock.set(studyDay.toJSDate());
                const daily = await service.getRevisionView("rollover");
                for (const row of daily.sessions.filter((s) => s.active)) {
                    expect(
                        (
                            await service.updateRevisionSession(
                                "rollover",
                                row.id,
                                {
                                    surahNumber: row.endSurahNumber,
                                    ayahNumber: row.endAyahNumber,
                                },
                            )
                        ).success,
                    ).toBe(true);
                    expect(
                        (
                            await service.updateRevisionSession(
                                "rollover",
                                row.id,
                                { outcome: "comfortable" },
                            )
                        ).success,
                    ).toBe(true);
                }
                studyDay = studyDay.plus({ days: 1 });
            }
            const nextQueue = await service.previewRevisionPlan(
                "rollover",
                settings,
            );
            expect(nextQueue.nextWeek).toBe(false);
            expect(
                nextQueue.sessions.every(
                    (s) => s.scheduledDate > credited.today,
                ),
            ).toBe(true);
            expect(
                (
                    await service.saveRevisionPlan(
                        "rollover",
                        settings,
                        nextQueue.key,
                    )
                ).success,
            ).toBe(true);
            const renewed = await service.getRevisionView("rollover");
            expect(renewed.week.id).not.toBe(old.week.id);
            expect(
                renewed.sessions.every((s) => s.scheduledDate > renewed.today),
            ).toBe(true);
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
            testClock.set(null);
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
                    "./reconcile-plan": reconciliation,
                    "../rotation": rotation,
                    "./service": service,
                },
            );
            expect(
                (await actions.previewWeeklyRevision(settings)).success,
            ).toBe(false);
            userId = "admin";
            expect(
                (
                    await actions.deleteWeeklyRevision({
                        version: "a".repeat(64),
                        confirmed: true,
                    })
                ).success,
            ).toBe(false);
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
                    "./reconcile-plan": reconciliation,
                    "../rotation": rotation,
                    "./service": service,
                    "@/features/notifications/server/web-push": {
                        isExpiredPushSubscription: () => false,
                        sendPushNotification: async (_sub, payload) => {
                            expect(JSON.parse(payload).url).toBe("/practice");
                            sent++;
                        },
                    },
                },
            );
            // Removing today from saved days must suppress today's reminder even
            // while the original week still contains a session dated today.
            await db
                .update(schema.learningSchedule)
                .set({
                    revisionDays: [notificationTime.plus({ days: 1 }).weekday],
                })
                .where(orm.eq(schema.learningSchedule.userId, "notify"));
            await reminders.sendRevisionReminders(notificationTime.toJSDate());
            expect(sent).toBe(0);
            expect(
                (await service.getRevisionView("notify")).sessions.every(
                    (s) => s.scheduledDate > notificationTime.toISODate(),
                ),
            ).toBe(true);
            await db
                .update(schema.learningSchedule)
                .set({ revisionDays: [] })
                .where(orm.eq(schema.learningSchedule.userId, "notify"));
            await reminders.sendRevisionReminders(notificationTime.toJSDate());
            expect(sent).toBe(0);
            await db
                .update(schema.learningSchedule)
                .set({ revisionDays: settings.days })
                .where(orm.eq(schema.learningSchedule.userId, "notify"));
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
            const deleteNotify = await service.getRevisionView("notify");
            userId = "notify";
            expect(
                (
                    await actions.deleteWeeklyRevision({
                        version: deleteNotify.version,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.deleteWeeklyRevision({
                        version: deleteNotify.version,
                        confirmed: true,
                    })
                ).success,
            ).toBe(true);
            expect((await service.getRevisionView("notify")).plan).toBeNull();
            await reminders.sendRevisionReminders(notificationTime.toJSDate());
            expect(sent).toBe(1);

            // A surah-only learner can enable revision and use sessions without completing a hizb.
            testClock.set(new Date("2026-10-05T12:00:00Z"));
            await db.insert(schema.user).values({
                id: "partial",
                name: "Partial",
                email: "partial@example.test",
            });
            await db.insert(schema.learningSchedule).values({
                userId: "partial",
                revisionDays: [1, 2, 3, 4, 5, 6, 7],
                memorizationDays: [],
            });
            const partialRanges = [1, 3].map((ayah) => ({
                surahNumber: 2,
                startAyahNumber: ayah,
                endAyahNumber: ayah,
            }));
            expect(
                (
                    await records.saveBaseline(
                        "partial",
                        {
                            hizbs: [],
                            ranges: partialRanges,
                            revision: 0,
                            setup: true,
                        },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            const partialPreview = await service.previewRevisionPlan(
                "partial",
                settings,
            );
            expect(partialPreview.ready).toBe(true);
            expect(partialPreview.completedHizbs).toBe(0);
            expect(partialPreview.memorizedAyahs).toBe(2);
            expect(
                (
                    await service.saveRevisionPlan(
                        "partial",
                        settings,
                        partialPreview.key,
                    )
                ).success,
            ).toBe(true);
            const partialView = await service.getRevisionView("partial");
            expect(partialView.rotation.totalAyahs).toBe(2);
            expect(partialView.rotation.scheduledAyahs).toBe(2);
            expect(partialView.rotation.remainingAyahs).toBe(0);
            expect(partialView.sessions.every((s) => s.available)).toBe(true);
            expect(
                partialView.sessions.map((s) => [
                    s.startAyahNumber,
                    s.endAyahNumber,
                ]),
            ).toEqual([
                [1, 1],
                [3, 3],
            ]);
            const partialSession = partialView.sessions[0];
            expect(
                (
                    await service.updateRevisionSession(
                        "partial",
                        partialSession.id,
                        { surahNumber: 2, ayahNumber: 1 },
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.updateRevisionSession(
                        "partial",
                        partialSession.id,
                        { outcome: "comfortable" },
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await records.saveBaseline(
                        "partial",
                        { hizbs: [], ranges: [], revision: 1, setup: false },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            const correctedPartial = await service.getRevisionView("partial");
            expect(
                correctedPartial.sessions.find((s) => s.startAyahNumber === 3),
            ).toBeUndefined();
            expect(
                correctedPartial.sessions.find((s) => s.startAyahNumber === 1)
                    .done,
            ).toBe(true);

            // Correct a paused, already-saved next-week plan before that week starts.
            testClock.set(new Date("2026-10-03T12:00:00Z"));
            await db.insert(schema.user).values({
                id: "repair",
                name: "Repair",
                email: "repair@example.test",
            });
            await db.insert(schema.learningSchedule).values({
                userId: "repair",
                revisionDays: [1, 2, 4, 5],
                memorizationDays: [],
            });
            await records.saveBaseline(
                "repair",
                { hizbs: [1, 2, 3, 4, 5, 6], revision: 0, setup: true },
                "hafs",
            );
            const repairSettings = { ...settings, quartersPerDay: 1 };
            const future = await activate("repair", repairSettings);
            expect(future.week.weekStart).toBe("2026-10-05");
            expect(future.sessions[0].startAyahNumber).toBe(1);
            const futurePreview = await service.previewRevisionPlan(
                "repair",
                repairSettings,
            );
            expect(
                (
                    await service.pauseRevisionPlan(
                        "repair",
                        future.plan.revision,
                    )
                ).success,
            ).toBe(true);
            await records.saveBaseline(
                "repair",
                { hizbs: [3, 4, 5, 6], revision: 1, setup: false },
                "hafs",
            );
            const repairedRows = await db
                .select()
                .from(schema.revisionSession)
                .where(orm.eq(schema.revisionSession.userId, "repair"));
            expect(repairedRows).toHaveLength(4);
            expect(repairedRows.every((s) => s.startAyahNumber >= 17)).toBe(
                true,
            );
            expect(repairedRows.map((s) => s.scheduledDate).sort()).toEqual(
                future.sessions.map((s) => s.scheduledDate).sort(),
            );
            const repaired = await service.getRevisionView("repair");
            expect(repaired.rotation.totalAyahs).toBe(32);
            expect(repaired.rotation.scheduledAyahs).toBe(8);
            expect(repaired.rotation.remainingAyahs).toBe(24);
            expect(repaired.rotation.weeks).toHaveLength(3);
            expect(
                repaired.rotation.weeks
                    .flatMap((w) => w.sessions)
                    .reduce((n, s) => n + s.ayahs, 0),
            ).toBe(24);
            expect(repaired.plan.enabled).toBe(false);
            expect(
                repaired.sessions.every((s) => s.available && !s.active),
            ).toBe(true);
            expect(
                (
                    await service.saveRevisionPlan(
                        "repair",
                        repairSettings,
                        futurePreview.key,
                    )
                ).reason,
            ).toBe("stale");
            expect(
                (
                    await service.updateRevisionSession(
                        "repair",
                        future.sessions[0].id,
                        { surahNumber: 2, ayahNumber: 1 },
                    )
                ).success,
            ).toBe(false);
            expect(
                (await service.getRevisionView("repair")).sessions.map(
                    (s) => s.id,
                ),
            ).toEqual(repaired.sessions.map((s) => s.id));

            // Retain an unaffected session and its reading position while repairing a partial range.
            const livePreview = await service.previewRevisionPlan(
                "repair",
                repairSettings,
            );
            await service.saveRevisionPlan(
                "repair",
                repairSettings,
                livePreview.key,
            );
            testClock.set(new Date("2026-10-05T12:00:00Z"));
            const live = await service.getRevisionView("repair");
            const untouched = live.sessions[0];
            expect(
                (
                    await service.updateRevisionSession(
                        "repair",
                        untouched.id,
                        {
                            surahNumber: 2,
                            ayahNumber: untouched.startAyahNumber,
                        },
                    )
                ).success,
            ).toBe(true);
            const shortened = live.sessions[1];
            const remaining = verses
                .filter(
                    (v) =>
                        v.ayahNumber >= 17 &&
                        v.ayahNumber !== shortened.startAyahNumber,
                )
                .map((v) => ({
                    surahNumber: 2,
                    startAyahNumber: v.ayahNumber,
                    endAyahNumber: v.ayahNumber,
                }));
            await records.saveBaseline(
                "repair",
                { hizbs: [], ranges: remaining, revision: 2, setup: false },
                "hafs",
            );
            const trimmed = await service.getRevisionView("repair");
            expect(
                trimmed.sessions.find((s) => s.id === untouched.id)
                    .progressAyahNumber,
            ).toBe(untouched.startAyahNumber);
            expect(trimmed.sessions.some((s) => s.id === shortened.id)).toBe(
                false,
            );
            expect(
                trimmed.sessions.some(
                    (s) =>
                        s.startAyahNumber === shortened.endAyahNumber &&
                        s.endAyahNumber === shortened.endAyahNumber,
                ),
            ).toBe(true);
            expect(trimmed.sessions.every((s) => s.available)).toBe(true);

            // Old inconsistent data self-heals on read, without requiring another correction.
            await db.insert(schema.revisionSession).values({
                id: "legacy-invalid",
                userId: "repair",
                weekId: trimmed.week.id,
                scheduledDate: "2026-10-09",
                ordinal: 999,
                quarters: [1],
                startSurahNumber: 2,
                startAyahNumber: 1,
                endSurahNumber: 2,
                endAyahNumber: 2,
            });
            expect(
                (await service.getRevisionView("repair")).sessions.some(
                    (s) => s.id === "legacy-invalid",
                ),
            ).toBe(false);
        } finally {
            await pool.end();
        }
    },
    30000,
);
