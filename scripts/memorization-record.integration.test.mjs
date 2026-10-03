import { expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { z } from "zod";
import * as schema from "../src/drizzle/schema";
import * as progress from "../src/features/memorization/progress";
import { loadRevisionReconciliation } from "./helpers/load-revision-reconciliation.mjs";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

// Never loads the app's .env; requires an empty disposable database.
const target = process.env.MEMORIZATION_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: self-service corrections, legacy requests, concurrency, practice, audit and migration",
    async () => {
        if (!new URL(target).pathname.endsWith("_memorization_tests"))
            throw new Error(
                "Use an empty disposable database ending in _memorization_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        const folder = await mkdtemp(
            join(tmpdir(), "memorization-migrations-"),
        );
        try {
            const existing = await pool.query(
                "select count(*)::int as count from information_schema.tables where table_schema='public'",
            );
            if (existing.rows[0].count)
                throw new Error("Refusing a nonempty test database.");
            await cp("src/drizzle/migrations", folder, { recursive: true });
            const journalPath = join(folder, "meta/_journal.json");
            const journal = JSON.parse(await readFile(journalPath, "utf8"));
            journal.entries = journal.entries.filter((e) => e.idx < 27);
            await writeFile(journalPath, JSON.stringify(journal));
            await migrate(db, { migrationsFolder: folder });
            await db.insert(schema.user).values(
                ["solo", "other", "expired", "admin", "legacy"].map((id) => ({
                    id,
                    name: id,
                    email: `${id}@example.test`,
                    role: id === "admin" ? "admin" : "member",
                })),
            );
            const assignment = (id, userId, extra = {}) => ({
                id,
                assigneeId: userId,
                assignedById: userId,
                riwayah: "hafs",
                kind: "memorization",
                startSurahNumber: 1,
                startAyahNumber: 1,
                endSurahNumber: 1,
                endAyahNumber: 7,
                ...extra,
            });
            await db
                .insert(schema.userMemorizedHizb)
                .values({ userId: "legacy", hizbNumber: 5 });
            await db.insert(schema.practiceAssignment).values([
                assignment("legacy-reviewed", "legacy", {
                    status: "completed",
                    reviewMethod: "peer",
                }),
                assignment("legacy-unreviewed", "legacy", {
                    status: "completed",
                }),
            ]);
            // Upgrade an existing hizb-only record and audit without losing their history.
            const throughPrevious = JSON.parse(
                await readFile(
                    "src/drizzle/migrations/meta/_journal.json",
                    "utf8",
                ),
            );
            throughPrevious.entries = throughPrevious.entries.filter(
                (entry) => entry.idx < 33,
            );
            await writeFile(journalPath, JSON.stringify(throughPrevious));
            await migrate(db, { migrationsFolder: folder });
            await pool.query(
                "insert into memorization_record (user_id, setup_at, revision) values ('legacy', now(), 1)",
            );
            await pool.query(
                "insert into memorization_baseline_change (id, user_id, previous_hizbs, hizbs, source) values ('legacy-history','legacy','[]','[5]','setup')",
            );
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            const legacyRecord = (
                await db.select().from(schema.memorizationRecord)
            )[0];
            expect(legacyRecord.revision).toBe(1);
            expect(legacyRecord.baselineRanges).toEqual([]);
            const legacyHistory = (
                await db.select().from(schema.memorizationBaselineChange)
            )[0];
            expect(legacyHistory.hizbs).toEqual([5]);
            expect(legacyHistory.ranges).toEqual([]);
            expect(legacyHistory.previousRanges).toEqual([]);
            expect(
                (await db.select().from(schema.memorizationAssessment)).map(
                    (a) => a.assignmentId,
                ),
            ).toEqual(["legacy-reviewed"]);
            expect(
                (await db.select().from(schema.userMemorizedHizb))[0]
                    .hizbNumber,
            ).toBe(5);
            expect(
                await db.select().from(schema.memorizationRecord),
            ).toHaveLength(1);
            const modules = {
                "server-only": {},
                "drizzle-orm": orm,
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
                "../progress": progress,
                "./get-memory-catalogue": async () => ({
                    hafs: Array.from({ length: 7 }, (_, i) => ({
                        surahNumber: 1,
                        ayahNumber: i + 1,
                        hizb: 1,
                        quarter: 1,
                        page: 1,
                        atoms: [String(i)],
                    })),
                    warsh: Array.from({ length: 8 }, (_, i) => ({
                        surahNumber: 1,
                        ayahNumber: i + 1,
                        hizb: 1,
                        quarter: 1,
                        page: 1,
                        atoms: [String(i)],
                    })),
                }),
            };
            modules["@/features/revision/server/reconcile-plan"] =
                loadRevisionReconciliation(
                    modules,
                    modules["./get-memory-catalogue"],
                );
            const service = loadTypeScript(
                "src/features/memorization/server/record-service.ts",
                modules,
            );
            const records = async (id) =>
                (
                    await db
                        .select()
                        .from(schema.memorizationRecord)
                        .where(orm.eq(schema.memorizationRecord.userId, id))
                )[0];
            const requests = async (id) =>
                db
                    .select()
                    .from(schema.memorizationCorrectionRequest)
                    .where(
                        orm.eq(schema.memorizationCorrectionRequest.userId, id),
                    )
                    .orderBy(
                        orm.desc(
                            schema.memorizationCorrectionRequest.createdAt,
                        ),
                    );
            const baseline = async (id) =>
                (
                    await db
                        .select()
                        .from(schema.userMemorizedHizb)
                        .where(orm.eq(schema.userMemorizedHizb.userId, id))
                )
                    .map((r) => r.hizbNumber)
                    .sort((a, b) => a - b);
            const events = async (id) =>
                db
                    .select()
                    .from(schema.memorizationAssessment)
                    .where(orm.eq(schema.memorizationAssessment.userId, id));

            // Fresh records can be empty or complete; simultaneous setups cannot overwrite each other.
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [], revision: 0, setup: true },
                        "warsh",
                    )
                ).success,
            ).toBe(true);
            expect((await records("solo")).baselineRiwayah).toBe("warsh");
            const setup = await Promise.all(
                [1, 2].map((n) =>
                    service.saveBaseline(
                        "other",
                        { hizbs: [n], revision: 0, setup: true },
                        "hafs",
                    ),
                ),
            );
            expect(setup.filter((r) => r.success)).toHaveLength(1);
            expect((await records("other")).revision).toBe(1);
            // An unchanged save does not create a new revision or audit entry.
            expect(
                await service.saveBaseline(
                    "solo",
                    { hizbs: [], revision: 1, setup: false },
                    "hafs",
                ),
            ).toEqual({ success: true, changed: false });
            expect((await records("solo")).revision).toBe(1);
            const corrected = await Promise.all(
                [1, 2].map((n) =>
                    service.saveBaseline(
                        "solo",
                        { hizbs: [n], revision: 1, setup: false },
                        "hafs",
                    ),
                ),
            );
            expect(corrected.filter((r) => r.success)).toHaveLength(1);
            expect(corrected.find((r) => !r.success).reason).toBe("stale");
            const firstCorrection = await baseline("solo");
            expect((await records("solo")).baselineRiwayah).toBe("warsh");

            // Corrections can be repeated without a request or a one-use grant.
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [3, 3], revision: 2, setup: false },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            expect(await baseline("solo")).toEqual([3]);
            expect((await records("solo")).revision).toBe(3);
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [4], revision: 2, setup: false },
                        "hafs",
                    )
                ).reason,
            ).toBe("stale");
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [], revision: 0, setup: true },
                        "hafs",
                    )
                ).reason,
            ).toBe("stale");
            expect(await baseline("solo")).toEqual([3]);
            expect(await requests("solo")).toHaveLength(0);
            const changes = await db
                .select()
                .from(schema.memorizationBaselineChange)
                .where(orm.eq(schema.memorizationBaselineChange.userId, "solo"))
                .orderBy(orm.asc(schema.memorizationBaselineChange.createdAt));
            expect(changes).toHaveLength(3);
            expect(changes.map((c) => c.source)).toEqual([
                "setup",
                "self",
                "self",
            ]);
            expect(changes[1].previousHizbs).toEqual([]);
            expect(changes[1].hizbs).toEqual(firstCorrection);
            expect(changes[2].previousHizbs).toEqual(firstCorrection);
            expect(changes[2].hizbs).toEqual([3]);
            expect(changes.every((c) => c.requestId === null)).toBe(true);

            // Old records with an expired window and a used correction are editable too.
            expect(
                (
                    await service.saveBaseline(
                        "expired",
                        {
                            hizbs: Array.from({ length: 60 }, (_, i) => i + 1),
                            revision: 0,
                            setup: true,
                        },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            await pool.query(
                "update memorization_record set setup_at=clock_timestamp()-interval '20 days', correction_used_at=clock_timestamp()-interval '19 days' where user_id='expired'",
            );
            const previousRecord = await records("expired");
            expect(
                (
                    await service.saveBaseline(
                        "expired",
                        { hizbs: [], revision: 1, setup: false },
                        "warsh",
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.saveBaseline(
                        "expired",
                        { hizbs: [60], revision: 2, setup: false },
                        "warsh",
                    )
                ).success,
            ).toBe(true);
            expect((await records("expired")).setupAt).toEqual(
                previousRecord.setupAt,
            );
            expect((await records("expired")).correctionUsedAt).toEqual(
                previousRecord.correctionUsedAt,
            );
            expect((await records("expired")).baselineRiwayah).toBe("hafs");

            // Legacy requests are historical data, regardless of their last status.
            for (const status of ["pending", "approved", "declined", "used"]) {
                const id = `legacy-${status}`;
                await db.insert(schema.user).values({
                    id,
                    name: id,
                    email: `${id}@example.test`,
                    role: "member",
                });
                await service.saveBaseline(
                    id,
                    { hizbs: [1], revision: 0, setup: true },
                    "hafs",
                );
                await db.insert(schema.memorizationCorrectionRequest).values({
                    id,
                    userId: id,
                    reason: "An earlier correction request",
                    status,
                    reviewNote: "Historical note",
                });
                const before = await requests(id);
                expect(
                    (
                        await service.saveBaseline(
                            id,
                            { hizbs: [2], revision: 1, setup: false },
                            "hafs",
                        )
                    ).success,
                ).toBe(true);
                expect(
                    (
                        await service.saveBaseline(
                            id,
                            { hizbs: [], revision: 2, setup: false },
                            "hafs",
                        )
                    ).success,
                ).toBe(true);
                expect(await requests(id)).toEqual(before);
            }

            // Personal practice works without group membership. Reaching the end alone earns nothing.
            await db
                .insert(schema.practiceAssignment)
                .values(assignment("personal", "solo"));
            expect(
                (
                    await service.confirmPersonalRange(
                        "solo",
                        "personal",
                        assignment("personal", "solo"),
                    )
                ).success,
            ).toBe(false);
            await db
                .update(schema.practiceAssignment)
                .set({ progressSurahNumber: 1, progressAyahNumber: 7 })
                .where(orm.eq(schema.practiceAssignment.id, "personal"));
            expect(await events("solo")).toHaveLength(0);
            expect(
                (
                    await service.confirmPersonalRange(
                        "other",
                        "personal",
                        assignment("personal", "solo"),
                    )
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.confirmPersonalRange(
                        "solo",
                        "personal",
                        assignment("personal", "solo", { endAyahNumber: 6 }),
                    )
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.confirmPersonalRange(
                        "solo",
                        "personal",
                        assignment("personal", "solo", { riwayah: "warsh" }),
                    )
                ).success,
            ).toBe(false);
            const confirmed = await Promise.all(
                [1, 2].map(() =>
                    service.confirmPersonalRange(
                        "solo",
                        "personal",
                        assignment("personal", "solo"),
                    ),
                ),
            );
            expect(confirmed.filter((r) => r.success)).toHaveLength(1);
            expect(await events("solo")).toHaveLength(1);
            expect((await events("solo"))[0].method).toBe("self");
            expect((await events("solo"))[0].endAyahNumber).toBe(7);
            const preserved = (await events("solo"))[0].id;
            await service.saveBaseline(
                "solo",
                { hizbs: [], revision: 3, setup: false },
                "hafs",
            );
            await db
                .delete(schema.practiceAssignment)
                .where(orm.eq(schema.practiceAssignment.id, "personal"));
            expect((await events("solo"))[0].id).toBe(preserved);
            await db.insert(schema.memorizationGroup).values({
                id: "group",
                name: "Test group",
                inviteCode: "MEMORYTEST",
                createdById: "admin",
            });
            await db.insert(schema.practiceAssignment).values(
                assignment("group-work", "solo", {
                    groupId: "group",
                    progressSurahNumber: 1,
                    progressAyahNumber: 7,
                }),
            );
            expect(
                (
                    await service.confirmPersonalRange(
                        "solo",
                        "group-work",
                        assignment("group-work", "solo"),
                    )
                ).success,
            ).toBe(false);
            const peerAssignment = assignment("group-work", "solo", {
                groupId: "group",
            });
            await db.transaction(async (tx) => {
                await service.recordAssessment(tx, peerAssignment, {
                    method: "peer",
                    outcome: "confirmed",
                    reviewerId: "admin",
                    sourceKey: "peer:occurrence1",
                });
                await service.recordAssessment(tx, peerAssignment, {
                    method: "peer",
                    outcome: "confirmed",
                    reviewerId: "admin",
                    sourceKey: "peer:occurrence1",
                });
            });
            expect(await events("solo")).toHaveLength(2);
            await expect(
                db.transaction(async (tx) => {
                    await service.recordAssessment(tx, peerAssignment, {
                        method: "peer",
                        outcome: "needs_revision",
                        reviewerId: "admin",
                        sourceKey: "peer:rollback",
                    });
                    throw new Error("rollback");
                }),
            ).rejects.toThrow("rollback");
            expect(await events("solo")).toHaveLength(2);

            // Public actions require a session, explicit confirmation and valid input. The session determines ownership.
            let userId = null;
            const actions = loadTypeScript(
                "src/features/memorization/server/record-actions.ts",
                {
                    ...modules,
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
                    "@/features/settings/server/get-preferences": async () => ({
                        riwayah: "hafs",
                    }),
                    "./record-service": service,
                },
            );
            expect(
                (
                    await actions.saveMemorizationBaseline({
                        hizbs: [],
                        revision: 0,
                        setup: true,
                        confirmed: true,
                    })
                ).success,
            ).toBe(false);
            userId = "other";
            for (const hizbs of [[0], [61], [1.5]])
                expect(
                    (
                        await actions.saveMemorizationBaseline({
                            hizbs,
                            revision: 1,
                            setup: false,
                            confirmed: true,
                        })
                    ).success,
                ).toBe(false);
            expect(
                (
                    await actions.saveMemorizationBaseline({
                        hizbs: [],
                        revision: 1,
                        setup: false,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.confirmPersonalMemorization({
                        assignmentId: "group-work",
                    })
                ).success,
            ).toBe(false);
            const soloBefore = await baseline("solo");
            expect(
                (
                    await actions.saveMemorizationBaseline({
                        userId: "solo",
                        hizbs: [9],
                        revision: 1,
                        setup: false,
                        confirmed: true,
                    })
                ).success,
            ).toBe(true);
            expect(await baseline("other")).toEqual([9]);
            expect(await baseline("solo")).toEqual(soloBefore);

            // Corrections never delete personal confirmations or circle assessments.
            const assessmentsBefore = await events("solo");
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [6], revision: 4, setup: false },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [], revision: 5, setup: false },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            expect(await events("solo")).toEqual(assessmentsBefore);
            // A learner can start with only part of a surah, correct it, and retain a complete audit.
            await db.insert(schema.user).values({
                id: "partial",
                name: "Partial learner",
                email: "partial@example.test",
            });
            const passage = {
                surahNumber: 1,
                startAyahNumber: 1,
                endAyahNumber: 3,
            };
            expect(
                (
                    await service.saveBaseline(
                        "partial",
                        {
                            hizbs: [],
                            ranges: [passage],
                            setup: true,
                            revision: 0,
                        },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            expect(await baseline("partial")).toEqual([]);
            expect((await records("partial")).baselineRanges).toEqual([
                passage,
            ]);
            // Equivalent, overlapping submissions normalize without another save.
            expect(
                (
                    await service.saveBaseline(
                        "partial",
                        {
                            hizbs: [],
                            ranges: [
                                passage,
                                { ...passage, startAyahNumber: 2 },
                            ],
                            setup: false,
                            revision: 1,
                        },
                        "hafs",
                    )
                ).changed,
            ).toBe(false);
            // The stored reading wins over a subsequently changed preference.
            expect(
                (
                    await service.saveBaseline(
                        "partial",
                        {
                            hizbs: [],
                            ranges: [{ ...passage, endAyahNumber: 8 }],
                            setup: false,
                            revision: 1,
                        },
                        "warsh",
                    )
                ).reason,
            ).toBe("invalid");
            expect((await records("partial")).revision).toBe(1);
            // Older open clients cannot erase passages they do not know about.
            expect(
                (
                    await service.saveBaseline(
                        "partial",
                        { hizbs: [2], setup: false, revision: 1 },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            expect((await records("partial")).baselineRanges).toEqual([
                passage,
            ]);
            expect(
                (
                    await service.saveBaseline(
                        "partial",
                        { hizbs: [], ranges: [], setup: false, revision: 2 },
                        "hafs",
                    )
                ).success,
            ).toBe(true);
            const audit = await db
                .select()
                .from(schema.memorizationBaselineChange)
                .where(
                    orm.eq(schema.memorizationBaselineChange.userId, "partial"),
                )
                .orderBy(orm.asc(schema.memorizationBaselineChange.createdAt));
            expect(audit.map((c) => c.ranges)).toEqual([
                [passage],
                [passage],
                [],
            ]);
            expect(audit.at(-1).previousRanges).toEqual([passage]);
            expect(
                (
                    await service.saveBaseline(
                        "partial",
                        {
                            hizbs: [],
                            ranges: [passage],
                            setup: false,
                            revision: 2,
                        },
                        "hafs",
                    )
                ).reason,
            ).toBe("stale");
            userId = "partial";
            expect(
                (
                    await actions.saveMemorizationBaseline({
                        hizbs: [],
                        ranges: [{ ...passage, startAyahNumber: 4 }],
                        setup: false,
                        revision: 3,
                        confirmed: true,
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await actions.saveMemorizationBaseline({
                        hizbs: [],
                        ranges: [{ ...passage, surahNumber: 115 }],
                        setup: false,
                        revision: 3,
                        confirmed: true,
                    })
                ).success,
            ).toBe(false);
        } finally {
            await pool.end();
            await rm(folder, { recursive: true, force: true });
        }
    },
    30000,
);
