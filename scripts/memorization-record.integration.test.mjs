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
import { loadTypeScript } from "./helpers/load-typescript.mjs";

// Never loads the app's .env; requires an empty disposable database.
const target = process.env.MEMORIZATION_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: setup, corrections, grants, personal practice, audit and migration",
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
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
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
            ).toHaveLength(0);
            const modules = {
                "server-only": {},
                "drizzle-orm": orm,
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
                "../progress": progress,
            };
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
            expect(
                (
                    await service.requestCorrection(
                        "solo",
                        "Fix my original selection",
                    )
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [], revision: 1, setup: false },
                        "hafs",
                    )
                ).changed,
            ).toBe(false);
            expect((await records("solo")).correctionUsedAt).toBeNull();
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
            expect((await records("solo")).correctionUsedAt).not.toBeNull();
            expect((await records("solo")).baselineRiwayah).toBe("warsh");
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [3], revision: 2, setup: false },
                        "hafs",
                    )
                ).reason,
            ).toBe("locked");
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        { hizbs: [3], revision: 0, setup: true },
                        "hafs",
                    )
                ).reason,
            ).toBe("stale");
            // Expiration is decided by the database clock, not a supplied client time.
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
                "update memorization_record set setup_at=clock_timestamp()-interval '3 hours' where user_id='expired'",
            );
            expect(
                (
                    await service.saveBaseline(
                        "expired",
                        { hizbs: [], revision: 1, setup: false },
                        "hafs",
                    )
                ).reason,
            ).toBe("locked");
            const sent = await Promise.all(
                [1, 2].map(() =>
                    service.requestCorrection(
                        "solo",
                        "I selected the wrong hizb.",
                    ),
                ),
            );
            expect(sent.filter((r) => r.success)).toHaveLength(1);
            const request = (await requests("solo"))[0];
            expect(
                (
                    await service.reviewCorrection(
                        "other",
                        request.id,
                        "approved",
                        "",
                    )
                ).success,
            ).toBe(false);
            const reviews = await Promise.all(
                [1, 2].map(() =>
                    service.reviewCorrection(
                        "admin",
                        request.id,
                        "approved",
                        "Please check before saving.",
                    ),
                ),
            );
            expect(reviews.filter((r) => r.success)).toHaveLength(1);
            await pool.query(
                "update memorization_correction_request set reviewed_at=clock_timestamp()-interval '20 days' where id=$1",
                [request.id],
            );
            expect(
                (
                    await service.requestCorrection(
                        "solo",
                        "Another request while approved",
                    )
                ).success,
            ).toBe(false);
            expect(
                (
                    await service.saveBaseline(
                        "solo",
                        {
                            hizbs: await baseline("solo"),
                            revision: 2,
                            setup: false,
                        },
                        "hafs",
                    )
                ).changed,
            ).toBe(false);
            expect((await requests("solo"))[0].status).toBe("approved");
            const grant = await Promise.all(
                [3, 4].map((n) =>
                    service.saveBaseline(
                        "solo",
                        { hizbs: [n], revision: 2, setup: false },
                        "hafs",
                    ),
                ),
            );
            expect(grant.filter((r) => r.success)).toHaveLength(1);
            expect((await requests("solo"))[0].status).toBe("used");
            const changes = await db
                .select()
                .from(schema.memorizationBaselineChange)
                .where(
                    orm.eq(schema.memorizationBaselineChange.userId, "solo"),
                );
            expect(changes).toHaveLength(3);
            expect(changes.find((c) => c.source === "admin").requestId).toBe(
                request.id,
            );
            expect(
                (
                    await service.requestCorrection(
                        "solo",
                        "I need a later correction",
                    )
                ).success,
            ).toBe(true);
            const later = (await requests("solo"))[0];
            expect(
                (
                    await service.reviewCorrection(
                        "admin",
                        later.id,
                        "declined",
                        "Explain the missing hizbs.",
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.requestCorrection(
                        "solo",
                        "The missing hizb is number 20",
                    )
                ).success,
            ).toBe(true);
            expect(
                (
                    await service.requestCorrection(
                        "expired",
                        "An expired window correction",
                    )
                ).success,
            ).toBe(true);

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
            const latest = (await requests("solo"))[0];
            await service.reviewCorrection("admin", latest.id, "approved", "");
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

            // Public actions require a session, explicit confirmation, valid input and an admin role.
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
                    "@/features/auth/permissions": {
                        getPlatformAdmin: async () =>
                            userId === "admin" ? { id: "admin" } : null,
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
            expect(
                (await actions.askMemorizationCorrection({ reason: "short" }))
                    .success,
            ).toBe(false);
            expect(
                (
                    await actions.reviewMemorizationCorrection({
                        requestId: request.id,
                        decision: "approved",
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
