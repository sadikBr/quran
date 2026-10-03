import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DateTime } from "luxon";
import pg from "pg";
import { z } from "zod";
import * as schema from "../src/drizzle/schema";
import * as carry from "../src/features/learning/carry-forward";
import * as learning from "../src/features/learning/schedule";
import * as capacity from "../src/features/learning/weekly-capacity";
import * as progress from "../src/features/memorization/progress";
import { quranReferenceSchema } from "../src/features/practice/types";
import * as rotation from "../src/features/revision/rotation";
import * as revision from "../src/features/revision/schedule";
import { databaseClock } from "./helpers/database-clock.mjs";
import { loadMemorizationReconciliation } from "./helpers/load-memorization-reconciliation.mjs";
import { loadRevisionReconciliation } from "./helpers/load-revision-reconciliation.mjs";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const target = process.env.LEARNING_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: shared days, upcoming coverage, confirmed progress, peer overlap, stale previews and rollover",
    async () => {
        if (!new URL(target).pathname.endsWith("_learning_tests"))
            throw new Error(
                "Use an empty disposable database ending in _learning_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        const folder = await mkdtemp(join(tmpdir(), "learning-migrations-"));
        try {
            const tables = await pool.query(
                "select count(*)::int as count from information_schema.tables where table_schema='public'",
            );
            if (tables.rows[0].count)
                throw new Error("Refusing a nonempty test database.");
            await cp("src/drizzle/migrations", folder, { recursive: true });
            const journalPath = join(folder, "meta/_journal.json");
            const journal = JSON.parse(await readFile(journalPath, "utf8"));
            journal.entries = journal.entries.filter((e) => e.idx < 30);
            await writeFile(journalPath, JSON.stringify(journal));
            await migrate(db, { migrationsFolder: folder });
            // Seed the old schema with its own columns before testing the upgrade.
            await pool.query(
                `insert into "user" (id, name, email) values ('legacy', 'legacy', 'legacy@example.test')`,
            );
            await db.insert(schema.revisionPlan).values({
                userId: "legacy",
                enabled: true,
                days: [2, 4],
                quartersPerDay: 1,
                timezone: "UTC",
                riwayah: "hafs",
            });
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            const [migrated] = await db
                .select()
                .from(schema.learningSchedule)
                .where(orm.eq(schema.learningSchedule.userId, "legacy"));
            expect(migrated.revisionDays).toEqual([2, 4]);
            expect(migrated.memorizationDays).toEqual([]);
            const ids = [
                "solo",
                "other",
                "peer",
                "rollover",
                "new",
                "revision",
                "admin",
                "manage",
                "budget",
                "budget-missed",
                "budget-guard",
            ];
            await db.insert(schema.user).values(
                ids.map((id) => ({
                    id,
                    name: id,
                    email: `${id}@example.test`,
                    role: id === "admin" ? "admin" : "member",
                })),
            );
            const verses = Array.from({ length: 64 }, (_, i) => ({
                surahNumber: 2,
                ayahNumber: i + 1,
                hizb: Math.floor(i / 32) + 1,
                quarter: Math.floor(i / 8) + 1,
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
            const common = {
                ...modules,
                "node:crypto": { createHash },
                luxon: { DateTime },
                "@/features/memorization/progress": progress,
                "@/features/learning/carry-forward": carry,
                "@/features/learning/server/plan-lifecycle": lifecycle,
                "./plan-lifecycle": lifecycle,
                "@/features/memorization/server/get-memory-catalogue":
                    async () => catalogue,
                "@/features/memorization/server/record-service": records,
                "./reconcile-plan": reconciliation,
                "../rotation": rotation,
            };
            const service = loadTypeScript(
                "src/features/learning/server/service.ts",
                {
                    ...common,
                    "@/features/revision/schedule": revision,
                    "../carry-forward": carry,
                    "../schedule": learning,
                    "../weekly-capacity": capacity,
                    "./reconcile-plan": memorizationReconciliation,
                },
            );
            const revisions = loadTypeScript(
                "src/features/revision/server/service.ts",
                { ...common, "../schedule": revision },
            );
            const recordView = loadTypeScript(
                "src/features/memorization/server/get-memorization-record.ts",
                {
                    ...modules,
                    "../progress": progress,
                    "@/features/revision/server/reconcile-plan": reconciliation,
                    "./get-memory-catalogue": async () => catalogue,
                },
            ).default;
            const config = {
                quartersPerWeek: 1,
                direction: "forward",
                timezone: "UTC",
                riwayah: "hafs",
            };
            const days = {
                revisionDays: [1, 2, 3, 4, 5, 6, 7],
                memorizationDays: [1, 2, 3, 4, 5, 6, 7],
                revision: 0,
            };
            for (const id of ids.filter((id) => id !== "new")) {
                expect(
                    (
                        await records.saveBaseline(
                            id,
                            {
                                hizbs: ["revision", "manage"].includes(id)
                                    ? [1]
                                    : [],
                                revision: 0,
                                setup: true,
                            },
                            "hafs",
                        )
                    ).success,
                ).toBe(true);
                expect(
                    (await service.saveLearningSchedule(id, days)).success,
                ).toBe(true);
            }
            const activate = async (id) => {
                const preview = await service.previewMemorizationPlan(
                    id,
                    config,
                );
                expect(
                    (
                        await service.saveMemorizationPlan(
                            id,
                            config,
                            preview.key,
                        )
                    ).success,
                ).toBe(true);
                return service.getMemorizationPlanView(id, "hafs");
            };
            const events = (id) =>
                db
                    .select()
                    .from(schema.memorizationAssessment)
                    .where(orm.eq(schema.memorizationAssessment.userId, id));
            const planned = (view) =>
                view.sessions
                    .filter((s) => s.scheduledDate)
                    .map((s) => ({
                        ...s,
                        riwayah: view.week.riwayah,
                    }));
            expect(
                (await service.previewMemorizationPlan("new", config)).ready,
            ).toBe(false);
            const preview = await service.previewMemorizationPlan(
                "solo",
                config,
            );
            expect(await events("solo")).toHaveLength(0);
            expect(
                await db.select().from(schema.memorizationWeek),
            ).toHaveLength(0);
            const saves = await Promise.all(
                [1, 2].map(() =>
                    service.saveMemorizationPlan("solo", config, preview.key),
                ),
            );
            expect(saves.filter((r) => r.success)).toHaveLength(1);
            let solo = await service.getMemorizationPlanView("solo", "hafs");
            const upcoming = await recordView("solo", "hafs", planned(solo));
            expect(upcoming.hizbs[0].percent).toBe(0);
            expect(upcoming.hizbs[0].upcoming).toBe(8);
            expect(upcoming.hizbs[0].planned.length).toBe(solo.sessions.length);
            const first = solo.sessions[0];
            // A valid owned session still cannot be opened or written before its study day.
            testClock.set(
                DateTime.fromISO(first.scheduledDate, { zone: "UTC" })
                    .minus({ days: 1 })
                    .set({ hour: 12 })
                    .toJSDate(),
            );
            expect(
                (
                    await service.getMemorizationPlanView("solo", "hafs")
                ).sessions.every((s) => !s.active),
            ).toBe(true);
            expect(
                (
                    await service.saveMemorizationProgress("solo", first.id, {
                        surahNumber: first.endSurahNumber,
                        ayahNumber: first.endAyahNumber,
                    })
                ).reason,
            ).toBe("inactive");
            expect(
                (await service.finishMemorizationSession("solo", first.id))
                    .reason,
            ).toBe("inactive");
            testClock.set(null);

            expect(
                (await service.finishMemorizationSession("other", first.id))
                    .success,
            ).toBe(false);
            expect(
                (await service.finishMemorizationSession("solo", "missing"))
                    .success,
            ).toBe(false);
            const beforeIds = solo.sessions.map((s) => s.id);
            const next = await service.previewMemorizationPlan("solo", {
                ...config,
                quartersPerWeek: 2,
            });
            expect(next.nextWeek).toBe(true);
            const changedDays = { ...days, memorizationDays: [1], revision: 1 };
            expect(
                (await service.saveLearningSchedule("solo", changedDays))
                    .success,
            ).toBe(true);
            expect(
                (
                    await service.saveMemorizationPlan(
                        "solo",
                        { ...config, quartersPerWeek: 2 },
                        next.key,
                    )
                ).reason,
            ).toBe("stale");
            solo = await service.getMemorizationPlanView("solo", "hafs");
            expect(solo.sessions.map((s) => s.id)).toEqual(beforeIds);
            expect(
                solo.sessions.every(
                    (s) => DateTime.fromISO(s.scheduledDate).weekday === 1,
                ),
            ).toBe(true);
            expect(
                (await service.finishMemorizationSession("solo", first.id))
                    .success,
            ).toBe(false);
            if (!solo.sessions[0].active) {
                expect(
                    (
                        await service.saveMemorizationProgress(
                            "solo",
                            first.id,
                            {
                                surahNumber: first.endSurahNumber,
                                ayahNumber: first.endAyahNumber,
                            },
                        )
                    ).reason,
                ).toBe("inactive");
            }
            await service.saveLearningSchedule("solo", {
                ...days,
                revision: 2,
            });
            const end = {
                surahNumber: first.endSurahNumber,
                ayahNumber: first.endAyahNumber,
            };
            expect(
                (await service.saveMemorizationProgress("other", first.id, end))
                    .success,
            ).toBe(false);
            expect(
                (
                    await service.saveMemorizationProgress("solo", first.id, {
                        ...end,
                        ayahNumber: 64,
                    })
                ).success,
            ).toBe(false);
            expect(
                (await service.saveMemorizationProgress("solo", first.id, end))
                    .success,
            ).toBe(true);
            const resumed = (
                await service.getMemorizationPlanView("solo", "hafs")
            ).sessions[0];
            expect(resumed.progressSurahNumber).toBe(end.surahNumber);
            expect(resumed.progressAyahNumber).toBe(end.ayahNumber);
            expect(resumed.done).toBe(false);
            expect(await events("solo")).toHaveLength(0);
            const finishes = await Promise.all(
                [1, 2].map(() =>
                    service.finishMemorizationSession("solo", first.id),
                ),
            );
            expect(finishes.every((r) => r.success)).toBe(true);
            expect(await events("solo")).toHaveLength(1);
            solo = await service.getMemorizationPlanView("solo", "hafs");
            expect(solo.sessions[0].done).toBe(true);
            const progressView = await recordView(
                "solo",
                "hafs",
                planned(solo),
            );
            expect(progressView.hizbs[0].completed).toBe(
                first.endAyahNumber - first.startAyahNumber + 1,
            );
            expect(
                progressView.hizbs[0].upcoming +
                    progressView.hizbs[0].completed,
            ).toBe(8);
            expect(
                (await service.saveLearningSchedule("solo", changedDays))
                    .reason,
            ).toBe("stale");
            expect(
                (
                    await service.pauseMemorizationPlan(
                        "solo",
                        solo.plan.revision,
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.finishMemorizationSession(
                        "solo",
                        solo.sessions.at(-1).id,
                    )
                ).success,
            ).toBe(false);

            expect(
                (await service.saveMemorizationProgress("solo", first.id, end))
                    .success,
            ).toBe(false);
            let peer = await activate("peer");
            const part = peer.sessions[0];
            const peerEvent = (start, end) => ({
                id: crypto.randomUUID(),
                userId: "peer",
                assignmentId: "circle-review",
                sourceKey: crypto.randomUUID(),
                reviewerId: "other",
                method: "peer",
                outcome: "confirmed",
                riwayah: "hafs",
                startSurahNumber: 2,
                startAyahNumber: start,
                endSurahNumber: 2,
                endAyahNumber: end,
            });
            await db
                .insert(schema.memorizationAssessment)
                .values(peerEvent(part.startAyahNumber, part.startAyahNumber));
            expect(
                (await service.getMemorizationPlanView("peer", "hafs"))
                    .sessions[0].completed,
            ).toBe(1);
            expect(
                (
                    await service.saveMemorizationProgress("peer", part.id, {
                        surahNumber: part.endSurahNumber,
                        ayahNumber: part.endAyahNumber,
                    })
                ).success,
            ).toBe(true);
            expect(
                (await service.finishMemorizationSession("peer", part.id))
                    .success,
            ).toBe(true);
            const self = (await events("peer")).filter(
                (e) => e.method === "self",
            );
            expect(
                self.every((s) => s.startAyahNumber > part.startAyahNumber),
            ).toBe(true);
            expect(
                (await service.getMemorizationPlanView("peer", "hafs"))
                    .sessions[0].done,
            ).toBe(true);
            for (const s of peer.sessions.slice(1))
                await db
                    .insert(schema.memorizationAssessment)
                    .values(peerEvent(s.startAyahNumber, s.endAyahNumber));
            peer = await service.getMemorizationPlanView("peer", "hafs");
            expect(peer.sessions.every((s) => s.done)).toBe(true);
            expect(
                (await recordView("peer", "hafs", planned(peer))).hizbs[0]
                    .upcoming,
            ).toBe(0);

            let old = await activate("rollover");
            // Ensure there is pending work even when this test runs on Sunday.
            if (old.sessions.length === 1) {
                const first = old.sessions[0];
                await db.insert(schema.memorizationSession).values({
                    id: "rollover-extra",
                    userId: "rollover",
                    weekId: old.week.id,
                    ordinal: first.ordinal + 1,
                    scheduledDate: DateTime.fromISO(first.scheduledDate)
                        .plus({ days: 1 })
                        .toISODate(),
                    quarters: [2],
                    startSurahNumber: 2,
                    startAyahNumber: 9,
                    endSurahNumber: 2,
                    endAyahNumber: 16,
                });
                old = await service.getMemorizationPlanView("rollover", "hafs");
            }
            await service.saveMemorizationProgress(
                "rollover",
                old.sessions[0].id,
                {
                    surahNumber: old.sessions[0].endSurahNumber,
                    ayahNumber: old.sessions[0].endAyahNumber,
                },
            );
            await service.finishMemorizationSession(
                "rollover",
                old.sessions[0].id,
            );
            const pending = old.sessions.at(-1);
            expect(
                (
                    await service.saveMemorizationProgress(
                        "rollover",
                        pending.id,
                        {
                            surahNumber: pending.startSurahNumber,
                            ayahNumber: pending.startAyahNumber,
                        },
                    )
                ).reason,
            ).toBe("inactive");
            testClock.set(
                DateTime.fromISO(pending.scheduledDate, { zone: "UTC" })
                    .set({ hour: 12 })
                    .toJSDate(),
            );
            expect(
                (
                    await service.saveMemorizationProgress(
                        "rollover",
                        pending.id,
                        {
                            surahNumber: pending.startSurahNumber,
                            ayahNumber: pending.startAyahNumber,
                        },
                    )
                ).success,
            ).toBe(true);
            testClock.set(null);
            await pool.query(
                "update memorization_week set week_start=week_start-28 where user_id='rollover'",
            );
            await pool.query(
                "update memorization_session set scheduled_date=scheduled_date-28 where user_id='rollover'",
            );
            const rolled = await Promise.all(
                [1, 2].map(() =>
                    service.getMemorizationPlanView("rollover", "hafs"),
                ),
            );
            expect(rolled[0].week.id).toBe(old.week.id);
            expect(rolled[1].week.id).toBe(old.week.id);
            expect(rolled[0].sessions.map((s) => s.id)).toEqual(
                old.sessions.map((s) => s.id),
            );
            expect(rolled[0].sessions[0].done).toBe(true);
            expect(rolled[0].sessions.at(-1).progressAyahNumber).toBe(
                pending.startAyahNumber,
            );
            expect(
                rolled[0].sessions
                    .filter((s) => !s.done)
                    .every((s) => s.scheduledDate > rolled[0].today),
            ).toBe(true);
            const afterQueue = await service.previewMemorizationPlan(
                "rollover",
                config,
            );
            expect(
                afterQueue.sessions.every(
                    (s) => s.startAyahNumber > pending.endAyahNumber,
                ),
            ).toBe(true);
            expect(afterQueue.nextWeek).toBe(true);
            expect(await events("rollover")).toHaveLength(1);
            expect(
                await db
                    .select()
                    .from(schema.memorizationWeek)
                    .where(orm.eq(schema.memorizationWeek.userId, "rollover")),
            ).toHaveLength(1);
            let studyDay = DateTime.utc();
            for (const session of rolled[0].sessions.filter((s) => !s.done)) {
                studyDay = studyDay.plus({ days: 1 });
                testClock.set(studyDay.toJSDate());
                expect(
                    (
                        await service.saveMemorizationProgress(
                            "rollover",
                            session.id,
                            {
                                surahNumber: session.endSurahNumber,
                                ayahNumber: session.endAyahNumber,
                            },
                        )
                    ).success,
                ).toBe(true);
                expect(
                    (
                        await service.finishMemorizationSession(
                            "rollover",
                            session.id,
                        )
                    ).success,
                ).toBe(true);
            }
            const fresh = await Promise.all(
                [1, 2].map(() =>
                    service.getMemorizationPlanView("rollover", "hafs"),
                ),
            );
            expect(fresh[0].week.id).toBe(fresh[1].week.id);
            expect(fresh[0].week.id).not.toBe(old.week.id);
            expect(
                fresh[0].sessions.every(
                    (s) =>
                        s.startAyahNumber > pending.endAyahNumber &&
                        s.scheduledDate > fresh[0].today,
                ),
            ).toBe(true);
            expect(
                (
                    await service.saveMemorizationProgress(
                        "rollover",
                        pending.id,
                        {
                            surahNumber: pending.endSurahNumber,
                            ayahNumber: pending.endAyahNumber,
                        },
                    )
                ).success,
            ).toBe(false);
            expect(
                await db
                    .select()
                    .from(schema.memorizationWeek)
                    .where(orm.eq(schema.memorizationWeek.userId, "rollover")),
            ).toHaveLength(2);

            testClock.set(null);

            // Revision must use saved days even if a client sends different weekdays.
            const revisionConfig = {
                days: [1],
                quartersPerDay: 1,
                timezone: "UTC",
                riwayah: "hafs",
                reminderTime: null,
            };
            const revPreview = await revisions.previewRevisionPlan(
                "revision",
                revisionConfig,
            );
            expect(
                (
                    await revisions.saveRevisionPlan(
                        "revision",
                        revisionConfig,
                        revPreview.key,
                    )
                ).success,
            ).toBe(true);
            const rev = await revisions.getRevisionView("revision");
            expect(rev.plan.days).toEqual(days.revisionDays);
            expect(rev.week.days).toEqual(days.revisionDays);
            expect(
                (
                    await service.saveLearningSchedule("revision", {
                        ...days,
                        revisionDays: [7],
                        revision: 1,
                    })
                ).success,
            ).toBe(true);
            expect(
                (await revisions.getRevisionView("revision")).week.days,
            ).toEqual(days.revisionDays);
            expect(
                (await revisions.getRevisionView("revision")).plan.days,
            ).toEqual([7]);

            const rescheduledRevision =
                await revisions.getRevisionView("revision");
            expect(rescheduledRevision.sessions.map((s) => s.id)).toEqual(
                rev.sessions.map((s) => s.id),
            );
            expect(
                rescheduledRevision.sessions.every(
                    (s) => DateTime.fromISO(s.scheduledDate).weekday === 7,
                ),
            ).toBe(true);
            const mem = await activate("revision");
            const savedPosition = mem.sessions[0];
            await service.saveMemorizationProgress(
                "revision",
                savedPosition.id,
                {
                    surahNumber: savedPosition.startSurahNumber,
                    ayahNumber: savedPosition.startAyahNumber,
                },
            );
            const identities = (view) =>
                view.sessions.map((s) => [
                    s.id,
                    s.startSurahNumber,
                    s.startAyahNumber,
                    s.endSurahNumber,
                    s.endAyahNumber,
                ]);
            const changed = {
                revisionDays: [1, 2, 4, 5],
                memorizationDays: [1, 2, 4, 5],
                revision: 2,
            };
            expect(
                (await service.saveLearningSchedule("revision", changed))
                    .success,
            ).toBe(true);
            for (const [view, original] of [
                [await revisions.getRevisionView("revision"), rev],
                [
                    await service.getMemorizationPlanView("revision", "hafs"),
                    mem,
                ],
            ]) {
                expect(identities(view)).toEqual(identities(original));
                expect(view.week.id).toBe(original.week.id);
                expect(view.week.days).toEqual(original.week.days);
                expect(
                    view.sessions.every((s) =>
                        changed.revisionDays.includes(
                            DateTime.fromISO(s.scheduledDate).weekday,
                        ),
                    ),
                ).toBe(true);
            }
            expect(
                (await service.getMemorizationPlanView("revision", "hafs"))
                    .sessions[0].progressAyahNumber,
            ).toBe(savedPosition.startAyahNumber);
            expect(
                (
                    await service.saveLearningSchedule("revision", {
                        revisionDays: [],
                        memorizationDays: [],
                        revision: 3,
                    })
                ).success,
            ).toBe(true);
            const undatedMem = await service.getMemorizationPlanView(
                "revision",
                "hafs",
            );
            const undatedRev = await revisions.getRevisionView("revision");
            expect(
                undatedMem.sessions.every((s) => s.scheduledDate === null),
            ).toBe(true);
            expect(
                undatedRev.sessions.every((s) => s.scheduledDate === null),
            ).toBe(true);
            expect(identities(undatedMem)).toEqual(identities(mem));
            expect(identities(undatedRev)).toEqual(identities(rev));
            expect(
                (await service.previewMemorizationPlan("revision", config))
                    .ready,
            ).toBe(false);
            expect(
                (
                    await revisions.previewRevisionPlan(
                        "revision",
                        revisionConfig,
                    )
                ).ready,
            ).toBe(false);
            expect(
                (await recordView("revision", "hafs", planned(undatedMem)))
                    .hizbs[1].upcoming,
            ).toBe(0);
            expect(await events("revision")).toHaveLength(0);
            expect(
                (
                    await service.saveLearningSchedule("revision", {
                        revisionDays: [2],
                        memorizationDays: [3],
                        revision: 4,
                    })
                ).success,
            ).toBe(true);
            const restoredRev = await revisions.getRevisionView("revision");
            const restoredMem = await service.getMemorizationPlanView(
                "revision",
                "hafs",
            );
            expect(
                restoredRev.sessions.every(
                    (s) => DateTime.fromISO(s.scheduledDate).weekday === 2,
                ),
            ).toBe(true);
            expect(
                restoredMem.sessions.every(
                    (s) => DateTime.fromISO(s.scheduledDate).weekday === 3,
                ),
            ).toBe(true);
            expect(restoredMem.sessions[0].progressAyahNumber).toBe(
                savedPosition.startAyahNumber,
            );
            const onlyMemDays = {
                revisionDays: [2],
                memorizationDays: [1],
                revision: 5,
            };
            expect(
                (await service.saveLearningSchedule("revision", onlyMemDays))
                    .success,
            ).toBe(true);
            const unchangedRev = await revisions.getRevisionView("revision");
            expect(unchangedRev.plan.revision).toBe(restoredRev.plan.revision);
            expect(unchangedRev.sessions).toEqual(restoredRev.sessions);
            expect(
                (
                    await service.getMemorizationPlanView("revision", "hafs")
                ).sessions.every(
                    (s) => DateTime.fromISO(s.scheduledDate).weekday === 1,
                ),
            ).toBe(true);
            expect(
                (await service.saveLearningSchedule("revision", onlyMemDays))
                    .reason,
            ).toBe("stale");

            // Explicit regeneration replaces the schedule; deletion keeps independent assessments.
            await service.saveLearningSchedule("manage", {
                revisionDays: [DateTime.utc().weekday],
                memorizationDays: [DateTime.utc().weekday],
                revision: 1,
            });
            await activate("manage");
            const initialRevPreview = await revisions.previewRevisionPlan(
                "manage",
                revisionConfig,
            );
            await revisions.saveRevisionPlan(
                "manage",
                revisionConfig,
                initialRevPreview.key,
            );
            const manageMem = await service.getMemorizationPlanView(
                "manage",
                "hafs",
            );
            const manageRev = await revisions.getRevisionView("manage");
            expect(manageMem.sessions).toHaveLength(1);
            expect(manageRev.sessions).toHaveLength(1);
            const initialMem = manageMem.sessions[0],
                initialRev = manageRev.sessions[0];
            await service.saveMemorizationProgress("manage", initialMem.id, {
                surahNumber: 2,
                ayahNumber: initialMem.endAyahNumber,
            });
            await service.finishMemorizationSession("manage", initialMem.id);
            await revisions.updateRevisionSession("manage", initialRev.id, {
                surahNumber: 2,
                ayahNumber: initialRev.endAyahNumber,
            });
            await revisions.updateRevisionSession("manage", initialRev.id, {
                outcome: "comfortable",
            });
            const historyBefore = await events("manage");
            expect(historyBefore).toHaveLength(2);
            await service.saveLearningSchedule("manage", {
                revisionDays: [1, 2, 4, 5],
                memorizationDays: [1, 2, 4, 5],
                revision: 2,
            });
            const memConfig = { ...config, quartersPerWeek: 2 };
            for (const kind of ["memorization", "revision"]) {
                const isMem = kind === "memorization";
                const getView = () =>
                    isMem
                        ? service.getMemorizationPlanView("manage", "hafs")
                        : revisions.getRevisionView("manage");
                const getOther = () =>
                    isMem
                        ? revisions.getRevisionView("manage")
                        : service.getMemorizationPlanView("manage", "hafs");
                const preview = () =>
                    isMem
                        ? service.previewMemorizationPlan(
                              "manage",
                              memConfig,
                              true,
                          )
                        : revisions.previewRevisionPlan(
                              "manage",
                              revisionConfig,
                              true,
                          );
                const save = (key) =>
                    isMem
                        ? service.saveMemorizationPlan(
                              "manage",
                              memConfig,
                              key,
                              true,
                          )
                        : revisions.saveRevisionPlan(
                              "manage",
                              revisionConfig,
                              key,
                              true,
                          );
                const remove = (owner, version) =>
                    isMem
                        ? service.deleteMemorizationPlan(owner, version)
                        : revisions.deleteRevisionPlan(owner, version);
                const pause = (revision) =>
                    isMem
                        ? service.pauseMemorizationPlan("manage", revision)
                        : revisions.pauseRevisionPlan("manage", revision);
                const previous = await getView();
                const other = await getOther();
                const proposed = await preview();
                expect(proposed.regenerate).toBe(true);
                expect(proposed.nextWeek).toBe(false);
                expect(proposed.sessions.length).toBeGreaterThan(0);
                const startingDay = proposed.sessions[0].scheduledDate;
                const dates = Array.from({ length: 7 }, (_, i) =>
                    DateTime.fromISO(proposed.weekStart).plus({ days: i }),
                ).filter(
                    (d) =>
                        [1, 2, 4, 5].includes(d.weekday) &&
                        d.toISODate() >= startingDay,
                );
                expect(
                    new Set(proposed.sessions.map((s) => s.scheduledDate)).size,
                ).toBe(
                    Math.min(
                        dates.length,
                        isMem || proposed.weekStart !== manageRev.week.weekStart
                            ? 4
                            : 3,
                    ),
                );

                expect(
                    proposed.sessions.every((s) =>
                        [1, 2, 4, 5].includes(
                            DateTime.fromISO(s.scheduledDate).weekday,
                        ),
                    ),
                ).toBe(true);
                expect((await getView()).sessions).toEqual(previous.sessions);
                const regenerated = await Promise.all([
                    save(proposed.key),
                    save(proposed.key),
                ]);
                expect(regenerated.filter((r) => r.success)).toHaveLength(1);
                let current = await getView();
                expect(identities(current).map((s) => s.slice(1))).toEqual(
                    proposed.sessions.map((s) => [
                        s.startSurahNumber,
                        s.startAyahNumber,
                        s.endSurahNumber,
                        s.endAyahNumber,
                    ]),
                );
                expect(current.sessions.map((s) => s.id)).not.toEqual(
                    previous.sessions.map((s) => s.id),
                );
                expect(current.week.weekStart).toBe(proposed.weekStart);
                expect((await getOther()).sessions).toEqual(other.sessions);
                expect(await events("manage")).toEqual(historyBefore);
                if (isMem)
                    expect(
                        current.sessions.every(
                            (s) => s.startAyahNumber > initialMem.endAyahNumber,
                        ),
                    ).toBe(true);
                const stale = await preview();
                const pending = current.sessions[0];
                testClock.set(
                    DateTime.fromISO(pending.scheduledDate, { zone: "UTC" })
                        .set({ hour: 12 })
                        .toJSDate(),
                );
                const update = {
                    surahNumber: pending.startSurahNumber,
                    ayahNumber: pending.startAyahNumber,
                };
                expect(
                    (
                        await (isMem
                            ? service.saveMemorizationProgress(
                                  "manage",
                                  pending.id,
                                  update,
                              )
                            : revisions.updateRevisionSession(
                                  "manage",
                                  pending.id,
                                  update,
                              ))
                    ).success,
                ).toBe(true);
                testClock.set(null);
                expect((await save(stale.key)).reason).toBe("stale");
                expect((await remove("manage", current.version)).reason).toBe(
                    "stale",
                );
                current = await getView();
                expect((await remove("other", current.version)).success).toBe(
                    false,
                );
                const previewBeforePause = await preview();
                expect((await pause(current.plan.revision)).success).toBe(true);
                expect((await save(previewBeforePause.key)).reason).toBe(
                    "stale",
                );
                const pausedPreview = await preview();
                expect((await save(pausedPreview.key)).success).toBe(true);
                const pausedView = await getView();
                expect(pausedView.plan.enabled).toBe(false);
                expect(
                    pausedView.sessions.every(
                        (s) => s.progressAyahNumber === null,
                    ),
                ).toBe(true);
                const expectedVersion = pausedView.version;
                const deleted = await Promise.all([
                    remove("manage", expectedVersion),
                    remove("manage", expectedVersion),
                ]);
                expect(deleted.filter((r) => r.success)).toHaveLength(1);
                const removed = await getView();
                expect(removed.plan).toBeNull();
                expect(removed.week).toBeNull();
                expect(removed.sessions).toEqual([]);
                expect(await events("manage")).toEqual(historyBefore);
                expect((await getOther()).sessions).toEqual(other.sessions);
                const weekTable = isMem
                    ? schema.memorizationWeek
                    : schema.revisionWeek;
                const sessionTable = isMem
                    ? schema.memorizationSession
                    : schema.revisionSession;
                expect(
                    await db
                        .select()
                        .from(weekTable)
                        .where(orm.eq(weekTable.userId, "manage")),
                ).toHaveLength(0);
                expect(
                    await db
                        .select()
                        .from(sessionTable)
                        .where(orm.eq(sessionTable.userId, "manage")),
                ).toHaveLength(0);
                // Recreating the plan must not revive old sessions or accept an old deletion confirmation.
                if (isMem) await activate("manage");
                else {
                    const freshPreview = await revisions.previewRevisionPlan(
                        "manage",
                        revisionConfig,
                    );
                    expect(
                        (
                            await revisions.saveRevisionPlan(
                                "manage",
                                revisionConfig,
                                freshPreview.key,
                            )
                        ).success,
                    ).toBe(true);
                }
                expect((await remove("manage", expectedVersion)).success).toBe(
                    false,
                );
                expect(
                    (await getView()).sessions.every(
                        (s) =>
                            !previous.sessions.some((old) => old.id === s.id),
                    ),
                ).toBe(true);
            }
            expect(
                (await service.getLearningSchedule("manage")).memorizationDays,
            ).toEqual([1, 2, 4, 5]);
            expect(
                (await recordView("manage", "hafs", [])).hizbs[1].percent,
            ).toBe(25);

            // Weekly limits include carry-over confirmations and survive rebuilding.
            const at = (day) => testClock.set(new Date(`${day}T12:00:00Z`));
            const complete = async (owner, session) => {
                expect(
                    (
                        await service.saveMemorizationProgress(
                            owner,
                            session.id,
                            {
                                surahNumber: session.endSurahNumber,
                                ayahNumber: session.endAyahNumber,
                            },
                        )
                    ).success,
                ).toBe(true);
                expect(
                    (await service.finishMemorizationSession(owner, session.id))
                        .success,
                ).toBe(true);
            };
            for (const owner of ["budget", "budget-missed", "budget-guard"])
                await service.saveLearningSchedule(owner, {
                    ...days,
                    memorizationDays: [1, 4],
                    revision: 1,
                });
            at("2026-09-28");
            const budget = await activate("budget");
            const missed = await activate("budget-missed");
            expect(budget.sessions.map((s) => s.scheduledDate)).toEqual([
                "2026-09-28",
                "2026-10-01",
            ]);
            // Miss Monday, then finish each original half-quarter on a later saved day.
            at("2026-10-01");
            await complete("budget", budget.sessions[0]);
            at("2026-10-05");
            const projectedBudget = await service.getMemorizationPlanView(
                "budget",
                "hafs",
            );
            expect(projectedBudget.sessions[1].active).toBe(true);
            const following = await service.previewMemorizationPlan(
                "budget",
                config,
            );
            expect(following.weekStart).toBe("2026-10-12");
            expect(following.sessions.flatMap((s) => s.quarters)).toEqual([
                2, 2,
            ]);
            await complete("budget", budget.sessions[1]);
            const nextBudget = await service.getMemorizationPlanView(
                "budget",
                "hafs",
            );
            expect(nextBudget.week.weekStart).toBe("2026-10-12");
            expect(nextBudget.sessions.map((s) => s.scheduledDate)).toEqual([
                "2026-10-12",
                "2026-10-15",
            ]);
            expect(nextBudget.sessions.every((s) => !s.active)).toBe(true);
            expect(
                (
                    await service.saveMemorizationProgress(
                        "budget",
                        nextBudget.sessions[0].id,
                        {
                            surahNumber: 2,
                            ayahNumber: nextBudget.sessions[0].endAyahNumber,
                        },
                    )
                ).reason,
            ).toBe("inactive");

            const rebuild = await service.previewMemorizationPlan(
                "budget",
                config,
                true,
            );
            expect(rebuild.weekStart).toBe("2026-10-12");
            expect(
                (
                    await service.saveMemorizationPlan(
                        "budget",
                        config,
                        rebuild.key,
                        true,
                    )
                ).success,
            ).toBe(true);
            const higherLimit = { ...config, quartersPerWeek: 2 };
            const twoQuarters = await service.previewMemorizationPlan(
                "budget",
                higherLimit,
                true,
            );
            expect(twoQuarters.weekStart).toBe("2026-10-05");
            // Quarter one has already used one slot, leaving only quarter two.
            expect(twoQuarters.sessions.flatMap((s) => s.quarters)).toEqual([
                2,
            ]);
            expect(twoQuarters.sessions[0].scheduledDate).toBe("2026-10-08");
            expect(
                (
                    await service.saveMemorizationPlan(
                        "budget",
                        higherLimit,
                        twoQuarters.key,
                        true,
                    )
                ).success,
            ).toBe(true);
            const beforeDelete = await service.getMemorizationPlanView(
                "budget",
                "hafs",
            );
            expect(
                (
                    await service.deleteMemorizationPlan(
                        "budget",
                        beforeDelete.version,
                    )
                ).success,
            ).toBe(true);
            const recreated = await activate("budget");
            expect(recreated.week.weekStart).toBe("2026-10-12");
            expect(await events("budget")).toHaveLength(2);

            // Already-created sessions must also obey the budget after new circle credit.
            const guard = await activate("budget-guard");
            await db.insert(schema.memorizationAssessment).values({
                ...peerEvent(9, 16),
                userId: "budget-guard",
                createdAt: new Date("2026-10-05T11:00:00Z"),
            });
            const guarded = await service.getMemorizationPlanView(
                "budget-guard",
                "hafs",
            );
            expect(guarded.sessions.map((s) => s.scheduledDate)).toEqual([
                "2026-10-12",
                "2026-10-15",
            ]);
            expect(guarded.sessions.every((s) => !s.active)).toBe(true);
            expect(
                (
                    await service.saveMemorizationProgress(
                        "budget-guard",
                        guard.sessions[0].id,
                        {
                            surahNumber: 2,
                            ayahNumber: guard.sessions[0].endAyahNumber,
                        },
                    )
                ).reason,
            ).toBe("inactive");
            expect(
                (
                    await service.finishMemorizationSession(
                        "budget-guard",
                        guard.sessions[0].id,
                    )
                ).reason,
            ).toBe("inactive");

            // Several completely missed weeks retain only the original two portions.
            at("2026-10-19");
            const afterMissed = await service.getMemorizationPlanView(
                "budget-missed",
                "hafs",
            );
            expect(afterMissed.sessions.map((s) => s.id)).toEqual(
                missed.sessions.map((s) => s.id),
            );
            expect(afterMissed.sessions.map((s) => s.scheduledDate)).toEqual([
                "2026-10-19",
                "2026-10-22",
            ]);
            expect(afterMissed.sessions.flatMap((s) => s.quarters)).toEqual([
                1, 1,
            ]);
            await complete("budget-missed", afterMissed.sessions[0]);
            at("2026-10-22");
            await complete("budget-missed", afterMissed.sessions[1]);
            const afterRecovery = await service.getMemorizationPlanView(
                "budget-missed",
                "hafs",
            );
            expect(afterRecovery.week.weekStart).toBe("2026-10-26");
            expect(afterRecovery.sessions.flatMap((s) => s.quarters)).toEqual([
                2, 2,
            ]);
            testClock.set(null);

            let userId = null;
            const actions = loadTypeScript(
                "src/features/learning/server/actions.ts",
                {
                    zod: { z },
                    "@/features/practice/types": { quranReferenceSchema },
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
                    "../schedule": learning,
                    "./service": service,
                },
            );
            expect(
                (await actions.previewWeeklyMemorization(config)).success,
            ).toBe(false);
            expect(
                (
                    await actions.saveWeeklyMemorizationProgress({
                        assignmentId: first.id,
                        ...end,
                    })
                ).success,
            ).toBe(false);
            userId = "admin";
            expect(
                (
                    await actions.saveWeeklyMemorizationProgress({
                        assignmentId: first.id,
                        ...end,
                    })
                ).success,
            ).toBe(false);
            expect((await actions.saveStudyDays(days)).success).toBe(false);
            expect(
                (
                    await actions.deleteWeeklyMemorization({
                        version: "a".repeat(64),
                        confirmed: true,
                    })
                ).success,
            ).toBe(false);

            userId = "manage";
            const deleteView = await service.getMemorizationPlanView(
                "manage",
                "hafs",
            );
            expect(
                (
                    await actions.deleteWeeklyMemorization({
                        version: deleteView.version,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.deleteWeeklyMemorization({
                        version: deleteView.version,
                        confirmed: true,
                    })
                ).success,
            ).toBe(true);
            userId = "other";
            expect(
                (
                    await actions.saveStudyDays({
                        revisionDays: [],
                        memorizationDays: [],
                        revision: 1,
                    })
                ).success,
            ).toBe(true);
            expect(
                (
                    await actions.saveWeeklyMemorizationProgress({
                        assignmentId: first.id,
                        ...end,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.saveWeeklyMemorizationProgress({
                        assignmentId: first.id,
                        surahNumber: 0,
                        ayahNumber: 1,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.completeWeeklyMemorization({
                        sessionId: first.id,
                        confirmed: true,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.completeWeeklyMemorization({
                        sessionId: first.id,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.saveWeeklyMemorization({
                        settings: config,
                        key: preview.key,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.previewWeeklyMemorization({
                        ...config,
                        quartersPerWeek: 0,
                    })
                ).success,
            ).toBe(false);

            // Starting ayah ranges appear on the map and are skipped by new memorization.
            testClock.set(new Date("2026-10-05T12:00:00Z"));
            await db.insert(schema.user).values({
                id: "partial",
                name: "Partial",
                email: "partial@example.test",
            });
            const partialRange = {
                surahNumber: 2,
                startAyahNumber: 1,
                endAyahNumber: 3,
            };
            expect(
                (
                    await records.saveBaseline(
                        "partial",
                        {
                            hizbs: [],
                            ranges: [partialRange],
                            revision: 0,
                            setup: true,
                        },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            await service.saveLearningSchedule("partial", days);
            const partialMap = await recordView("partial", "hafs");
            expect(partialMap.memorizedAyahs).toBe(3);
            expect(partialMap.completedHizbs).toEqual([]);
            expect(partialMap.memorizedRanges).toEqual([partialRange]);
            expect(partialMap.hizbs[0].completed).toBe(3);
            const partialPreview = await service.previewMemorizationPlan(
                "partial",
                config,
            );
            expect(partialPreview.ready).toBe(true);
            expect(partialPreview.sessions.length).toBeGreaterThan(0);
            expect(partialPreview.sessions[0].startAyahNumber).toBe(4);
            expect(
                partialPreview.sessions.every((s) => s.startAyahNumber >= 4),
            ).toBe(true);
            await records.saveBaseline(
                "partial",
                {
                    hizbs: [],
                    ranges: [{ ...partialRange, endAyahNumber: 4 }],
                    revision: 1,
                    setup: false,
                },
                "hafs",
            );
            expect(
                (
                    await service.saveMemorizationPlan(
                        "partial",
                        config,
                        partialPreview.key,
                    )
                ).success,
            ).toBe(false);
            // Grid corrections repair saved plans transactionally, including paused
            // plans and readers opened before the correction.
            testClock.set(new Date("2026-11-02T12:00:00Z"));
            const seedAuto = async (id, baseline, direction = "forward") => {
                await db
                    .insert(schema.user)
                    .values({ id, name: id, email: `${id}@example.test` });
                await records.saveBaseline(
                    id,
                    { hizbs: baseline, revision: 0, setup: true },
                    "hafs",
                );
                await service.saveLearningSchedule(id, {
                    ...days,
                    memorizationDays: [1, 4],
                });
                const settings = { ...config, direction };
                const preview = await service.previewMemorizationPlan(
                    id,
                    settings,
                );
                expect(
                    (
                        await service.saveMemorizationPlan(
                            id,
                            settings,
                            preview.key,
                        )
                    ).success,
                ).toBe(true);
                return service.getMemorizationPlanView(id, "hafs");
            };
            const correct = async (id, hizbs, ranges = []) => {
                const [record] = await db
                    .select()
                    .from(schema.memorizationRecord)
                    .where(orm.eq(schema.memorizationRecord.userId, id));
                expect(
                    (
                        await records.saveBaseline(
                            id,
                            {
                                hizbs,
                                ranges,
                                revision: record.revision,
                                setup: false,
                            },
                            "hafs",
                        )
                    ).success,
                ).toBe(true);
            };
            const nativeRange = (start, end) => ({
                surahNumber: 2,
                startAyahNumber: start,
                endAyahNumber: end,
            });
            const pendingAyahs = (view) =>
                view.sessions
                    .filter((s) => !s.done)
                    .flatMap((s) =>
                        progress
                            .assessmentVerses(catalogue, {
                                ...s,
                                riwayah: view.week.riwayah,
                            })
                            .map((v) => v.ayahNumber),
                    );
            let auto = await seedAuto("auto-forward", [1]);
            expect(pendingAyahs(auto)).toEqual([
                33, 34, 35, 36, 37, 38, 39, 40,
            ]);
            const oldId = auto.sessions[0].id;
            await service.saveMemorizationProgress("auto-forward", oldId, {
                surahNumber: 2,
                ayahNumber: 35,
            });
            await correct("auto-forward", [1], [nativeRange(49, 50)]);
            auto = await service.getMemorizationPlanView(
                "auto-forward",
                "hafs",
            );
            expect(auto.sessions[0].id).toBe(oldId);
            expect(auto.sessions[0].progressAyahNumber).toBe(35);
            const stalePreview = await service.previewMemorizationPlan(
                "auto-forward",
                config,
            );
            await correct("auto-forward", [], [nativeRange(49, 50)]);
            // Inspect storage before any plan read: repair committed with the correction.
            const repairedRows = await db
                .select()
                .from(schema.memorizationSession)
                .where(
                    orm.eq(schema.memorizationSession.userId, "auto-forward"),
                )
                .orderBy(orm.asc(schema.memorizationSession.ordinal));
            expect(repairedRows[0].startAyahNumber).toBe(1);
            expect(repairedRows[0].progressAyahNumber).toBeNull();
            expect(
                (await service.finishMemorizationSession("auto-forward", oldId))
                    .success,
            ).toBe(false);
            expect(
                (
                    await service.saveMemorizationProgress(
                        "auto-forward",
                        oldId,
                        { surahNumber: 2, ayahNumber: 36 },
                    )
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.saveMemorizationPlan(
                        "auto-forward",
                        config,
                        stalePreview.key,
                    )
                ).reason,
            ).toBe("stale");
            await correct(
                "auto-forward",
                [],
                [nativeRange(1, 3), nativeRange(6, 6)],
            );
            auto = await service.getMemorizationPlanView(
                "auto-forward",
                "hafs",
            );
            expect(pendingAyahs(auto)).toEqual([4, 5, 7, 8]);
            await correct("auto-forward", [], [nativeRange(1, 8)]);
            auto = await service.getMemorizationPlanView(
                "auto-forward",
                "hafs",
            );
            const completed = auto.sessions[0];
            expect(completed.startAyahNumber).toBe(9);
            expect(
                (
                    await service.saveMemorizationProgress(
                        "auto-forward",
                        completed.id,
                        { surahNumber: 2, ayahNumber: completed.endAyahNumber },
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.finishMemorizationSession(
                        "auto-forward",
                        completed.id,
                    )
                ).success,
            ).toBe(true);
            const confirmedBefore = await events("auto-forward");
            await correct("auto-forward", []);
            auto = await service.getMemorizationPlanView(
                "auto-forward",
                "hafs",
            );
            expect(auto.sessions.find((s) => s.id === completed.id)?.done).toBe(
                true,
            );
            // Earlier missing ayahs take precedence even when a later quarter
            // has already consumed this week's allowance.
            expect(pendingAyahs(auto)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
            expect(
                auto.sessions
                    .filter((s) => !s.done)
                    .every((s) => s.scheduledDate >= "2026-11-09"),
            ).toBe(true);
            expect(await events("auto-forward")).toEqual(confirmedBefore);
            // Mark the rest of this quarter known: a fresh quarter must wait,
            // even if the corrected baseline now includes the confirmed work.
            await correct("auto-forward", [], [nativeRange(9, 16)]);
            auto = await service.getMemorizationPlanView(
                "auto-forward",
                "hafs",
            );
            expect(pendingAyahs(auto)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
            expect(
                auto.sessions
                    .filter((s) => !s.done)
                    .every((s) => s.scheduledDate >= "2026-11-09"),
            ).toBe(true);
            expect(auto.sessions.find((s) => s.id === completed.id)?.done).toBe(
                true,
            );
            const stableIds = auto.sessions.map((s) => s.id);
            expect(
                (
                    await service.getMemorizationPlanView(
                        "auto-forward",
                        "hafs",
                    )
                ).sessions.map((s) => s.id),
            ).toEqual(stableIds);
            expect(
                (await service.getMemorizationPlanView("auto-forward", "hafs"))
                    .plan.revision,
            ).toBe(auto.plan.revision);

            let reverse = await seedAuto("auto-backward", [2], "backward");
            expect(pendingAyahs(reverse)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
            await service.pauseMemorizationPlan(
                "auto-backward",
                reverse.plan.revision,
            );
            await correct("auto-backward", []);
            reverse = await service.getMemorizationPlanView(
                "auto-backward",
                "hafs",
            );
            expect(reverse.plan.enabled).toBe(false);
            expect(reverse.sessions.every((s) => !s.active)).toBe(true);
            expect(pendingAyahs(reverse)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
            await correct("auto-backward", [1, 2]);
            expect(
                (await service.getMemorizationPlanView("auto-backward", "hafs"))
                    .sessions,
            ).toEqual([]);
            await correct("auto-backward", [], [nativeRange(1, 8)]);
            reverse = await service.getMemorizationPlanView(
                "auto-backward",
                "hafs",
            );
            expect(pendingAyahs(reverse)).toEqual([
                9, 10, 11, 12, 13, 14, 15, 16,
            ]);
            await service.saveLearningSchedule("auto-backward", {
                ...days,
                memorizationDays: [],
                revision: 1,
            });
            await correct("auto-backward", []);
            reverse = await service.getMemorizationPlanView(
                "auto-backward",
                "hafs",
            );
            expect(pendingAyahs(reverse)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
            expect(
                reverse.sessions.every((s) => s.scheduledDate === null),
            ).toBe(true);
            // A missed repair (or a plan created before this feature) is healed on read.
            await db
                .update(schema.memorizationRecord)
                .set({
                    baselineRanges: [nativeRange(1, 8)],
                    revision: orm.sql`${schema.memorizationRecord.revision} + 1`,
                })
                .where(
                    orm.eq(schema.memorizationRecord.userId, "auto-backward"),
                );
            reverse = await service.getMemorizationPlanView(
                "auto-backward",
                "hafs",
            );
            expect(pendingAyahs(reverse)).toEqual([
                9, 10, 11, 12, 13, 14, 15, 16,
            ]);
            // Completed historical work must use the latest target for the next
            // batch, including completion through a circle rather than this reader.
            const historical = await seedAuto("auto-history", [1]);
            await db.insert(schema.memorizationAssessment).values({
                id: "history-circle-credit",
                userId: "auto-history",
                assignmentId: "circle",
                sourceKey: "peer:auto-history",
                reviewerId: "other",
                method: "peer",
                outcome: "confirmed",
                riwayah: "hafs",
                startSurahNumber: 2,
                startAyahNumber: 33,
                endSurahNumber: 2,
                endAyahNumber: 40,
                createdAt: new Date("2026-11-02T12:00:00Z"),
            });
            const nextTarget = { ...config, quartersPerWeek: 2 };
            const targetPreview = await service.previewMemorizationPlan(
                "auto-history",
                nextTarget,
            );
            expect(
                (
                    await service.saveMemorizationPlan(
                        "auto-history",
                        nextTarget,
                        targetPreview.key,
                    )
                ).success,
            ).toBe(true);
            testClock.set(new Date("2026-11-09T12:00:00Z"));
            await correct("auto-history", []);
            const historicalNext = await service.getMemorizationPlanView(
                "auto-history",
                "hafs",
            );
            expect(historicalNext.week.id).not.toBe(historical.week.id);
            expect(historicalNext.week.quartersPerWeek).toBe(2);
            expect(pendingAyahs(historicalNext)).toEqual(
                Array.from({ length: 16 }, (_, i) => i + 1),
            );
            testClock.set(null);
        } finally {
            await pool.end();
            await rm(folder, { recursive: true, force: true });
        }
    },
    30000,
);
