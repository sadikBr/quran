import { expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "../src/drizzle/schema";
import { loadMemorizationReconciliation } from "./helpers/load-memorization-reconciliation.mjs";

const target = process.env.AUTO_PLAN_TEST_DATABASE_URL;
(target ? test : test.skip)(
    "database: upgrade manual and automatic plans to forward surah order without losing completed history",
    async () => {
        if (!new URL(target).pathname.endsWith("_auto_plan_tests"))
            throw new Error(
                "Use an empty disposable database ending in _auto_plan_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        const folder = await mkdtemp(join(tmpdir(), "auto-plan-migration-"));
        try {
            const tables = await pool.query(
                "select count(*)::int as count from information_schema.tables where table_schema='public'",
            );
            if (tables.rows[0].count)
                throw new Error("Refusing a nonempty test database.");
            await cp("src/drizzle/migrations", folder, { recursive: true });
            const path = join(folder, "meta/_journal.json");
            const journal = JSON.parse(await readFile(path, "utf8"));
            journal.entries = journal.entries.filter((e) => e.idx < 36);
            await writeFile(path, JSON.stringify(journal));
            await migrate(db, { migrationsFolder: folder });
            await db.insert(schema.user).values({
                id: "legacy",
                name: "Legacy",
                email: "legacy@example.test",
            });
            await db.insert(schema.memorizationRecord).values({
                userId: "legacy",
                setupAt: new Date("2026-11-01"),
                baselineRiwayah: "hafs",
                revision: 1,
            });
            await db.insert(schema.learningSchedule).values({
                userId: "legacy",
                memorizationDays: [1, 4],
                revisionDays: [],
            });
            await pool.query(
                `insert into memorization_plan (user_id, quarters_per_week, start_quarter, direction, timezone, riwayah) values ('legacy', 1, 6, 'backward', 'UTC', 'hafs')`,
            );
            await pool.query(
                `insert into memorization_week (id, user_id, week_start, timezone, riwayah, days, quarters_per_week) values ('week', 'legacy', '2026-11-02', 'UTC', 'hafs', '[1,4]', 1)`,
            );
            await db.insert(schema.memorizationSession).values([
                {
                    id: "completed",
                    userId: "legacy",
                    weekId: "week",
                    scheduledDate: "2026-11-02",
                    ordinal: 0,
                    quarters: [5],
                    startSurahNumber: 2,
                    startAyahNumber: 33,
                    endSurahNumber: 2,
                    endAyahNumber: 40,
                    completedAt: new Date("2026-11-02T10:00:00Z"),
                    progressSurahNumber: 2,
                    progressAyahNumber: 40,
                },
                {
                    id: "manual-start",
                    userId: "legacy",
                    weekId: "week",
                    scheduledDate: "2026-11-05",
                    ordinal: 1,
                    quarters: [6],
                    startSurahNumber: 2,
                    startAyahNumber: 41,
                    endSurahNumber: 2,
                    endAyahNumber: 48,
                    progressSurahNumber: 2,
                    progressAyahNumber: 42,
                },
            ]);
            await db.insert(schema.memorizationAssessment).values({
                id: "credit",
                userId: "legacy",
                assignmentId: "completed",
                sourceKey: "memorization-weekly:completed:0",
                reviewerId: "legacy",
                method: "self",
                outcome: "confirmed",
                riwayah: "hafs",
                startSurahNumber: 2,
                startAyahNumber: 33,
                endSurahNumber: 2,
                endAyahNumber: 40,
                createdAt: new Date("2026-11-02T10:00:00Z"),
            });
            // First upgrade to the previous automatic-start release and mark its
            // baseline as current. The sequence migration must still repair it.
            const previousJournal = JSON.parse(
                await readFile(
                    "src/drizzle/migrations/meta/_journal.json",
                    "utf8",
                ),
            );
            previousJournal.entries = previousJournal.entries.filter(
                (entry) => entry.idx < 37,
            );
            await writeFile(path, JSON.stringify(previousJournal));
            await migrate(db, { migrationsFolder: folder });
            await pool.query(
                "update memorization_week set baseline_revision = 1",
            );
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            const [week] = await db.select().from(schema.memorizationWeek);
            expect(week.direction).toBe("backward");
            expect(week.baselineRevision).toBe(1);
            expect(week.sequenceVersion).toBe(1);
            expect(
                await db.select().from(schema.memorizationSession),
            ).toHaveLength(2);
            expect(
                (
                    await pool.query(
                        "select column_name from information_schema.columns where table_name='memorization_plan' and column_name='start_quarter'",
                    )
                ).rows,
            ).toEqual([]);
            const verses = Array.from({ length: 64 }, (_, i) => ({
                surahNumber: 2,
                ayahNumber: i + 1,
                quarter: Math.floor(i / 8) + 1,
                hizb: Math.floor(i / 32) + 1,
                page: 1,
                atoms: [`a${i + 1}`],
            }));
            const catalogue = { hafs: verses, warsh: verses };
            const { reconcileMemorizationPlan } =
                loadMemorizationReconciliation(
                    {
                        "server-only": {},
                        "drizzle-orm": orm,
                        "@/drizzle/db": db,
                        "@/drizzle/schema": schema,
                    },
                    async () => catalogue,
                );
            const repair = () =>
                db.transaction(async (tx) => {
                    await tx
                        .select()
                        .from(schema.memorizationRecord)
                        .where(
                            orm.eq(schema.memorizationRecord.userId, "legacy"),
                        )
                        .for("update");
                    return reconcileMemorizationPlan(
                        tx,
                        "legacy",
                        new Date("2026-11-02T12:00:00Z"),
                    );
                });
            expect(await repair()).toBe(true);
            const sessions = await db
                .select()
                .from(schema.memorizationSession)
                .orderBy(orm.asc(schema.memorizationSession.ordinal));
            expect(sessions[0].id).toBe("completed");
            expect(sessions[0].completedAt.toISOString()).toBe(
                "2026-11-02T10:00:00.000Z",
            );
            expect(sessions[1].startAyahNumber).toBe(1);
            expect(
                (await db.select().from(schema.memorizationWeek))[0]
                    .sequenceVersion,
            ).toBe(2);
            expect(sessions[1].scheduledDate).toBe("2026-11-09");
            expect(sessions.some((s) => s.id === "manual-start")).toBe(false);
            expect(
                await db.select().from(schema.memorizationAssessment),
            ).toHaveLength(1);
            expect(await repair()).toBe(false);
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            expect(
                await db
                    .select()
                    .from(schema.memorizationSession)
                    .orderBy(orm.asc(schema.memorizationSession.ordinal)),
            ).toEqual(sessions);
        } finally {
            await pool.end();
            await rm(folder, { recursive: true, force: true });
        }
    },
    30000,
);
