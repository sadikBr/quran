// Requires an empty disposable DB; never reads the application's database config.
import { expect, test } from "bun:test";
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "../src/drizzle/schema";

const target = process.env.USER_MIGRATION_TEST_DATABASE_URL;
const run = target ? test : test.skip;
run(
    "upgrade: an already-applied 0034 gains data_reset_at without losing sessions or existing reset dates",
    async () => {
        if (!new URL(target).pathname.endsWith("_migration_tests"))
            throw Error("Use a disposable database ending in _migration_tests");
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        const folder = await mkdtemp(
            join(tmpdir(), "quran-migration-history-"),
        );
        try {
            const existing = await pool.query(
                "select count(*)::int n from information_schema.tables where table_schema = 'public'",
            );
            if (existing.rows[0].n) throw Error("Refusing a nonempty database");
            const history = JSON.parse(
                await readFile(
                    "src/drizzle/migrations/meta/_journal.json",
                    "utf8",
                ),
            );
            const beforeReset = {
                ...history,
                entries: history.entries.filter((e) => e.idx <= 34),
            };
            const repair = history.entries.find(
                (e) => e.tag === "0035_user_data_reset",
            );
            await mkdir(join(folder, "meta"));
            await writeFile(
                join(folder, "meta/_journal.json"),
                JSON.stringify(beforeReset),
            );
            for (const e of beforeReset.entries)
                await copyFile(
                    `src/drizzle/migrations/${e.tag}.sql`,
                    join(folder, `${e.tag}.sql`),
                );
            await migrate(db, { migrationsFolder: folder });
            expect(
                (
                    await pool.query(
                        "select column_name from information_schema.columns where table_schema='public' and table_name='user' and column_name='data_reset_at'",
                    )
                ).rowCount,
            ).toBe(0);
            await pool.query(
                `insert into "user" (id,name,email) values ('existing-learner','Existing learner','existing@example.test')`,
            );
            await pool.query(
                `insert into session (id,user_id,token,expires_at) values ('existing-session','existing-learner','existing-session-test-token',now()+interval '1 day')`,
            );
            await pool.query(
                `insert into user_reading_progress (user_id,last_page_number) values ('existing-learner',42)`,
            );
            const usersBefore = (await pool.query('select * from "user"')).rows;
            const sessionsBefore = (await pool.query("select * from session"))
                .rows;
            const auth = betterAuth({
                baseURL: "http://localhost:55445",
                secret: "isolated-migration-test-secret-at-least-32-characters",
                database: drizzleAdapter(db, { provider: "pg" }),
                user: {
                    additionalFields: {
                        dataResetAt: {
                            type: "date",
                            required: false,
                            input: false,
                        },
                    },
                },
            });
            const context = await auth.$context;
            // The reported fallback user query really fails before the new migration.
            await expect(
                context.internalAdapter.findSession(
                    "existing-session-test-token",
                ),
            ).rejects.toThrow();
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            const restored = await context.internalAdapter.findSession(
                "existing-session-test-token",
            );
            expect(restored.user.id).toBe("existing-learner");
            expect(restored.user.dataResetAt).toBeNull();
            expect((await pool.query("select * from session")).rows).toEqual(
                sessionsBefore,
            );
            expect(
                (await pool.query('select * from "user"')).rows.map(
                    ({ data_reset_at, ...row }) => row,
                ),
            ).toEqual(usersBefore);
            expect(
                (
                    await pool.query(
                        "select last_page_number from user_reading_progress where user_id='existing-learner'",
                    )
                ).rows[0].last_page_number,
            ).toBe(42);
            expect(
                (
                    await pool.query(
                        "select count(*)::int n from drizzle.__drizzle_migrations where created_at=$1",
                        [repair.when],
                    )
                ).rows[0].n,
            ).toBe(1);
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            expect(
                (
                    await pool.query(
                        "select count(*)::int n from drizzle.__drizzle_migrations where created_at=$1",
                        [repair.when],
                    )
                ).rows[0].n,
            ).toBe(1);

            // Simulate an installation that had the column in the altered 0034 already.
            // Only this freshly created disposable database's journal is changed.
            const resetAt = new Date("2026-10-03T12:00:00.000Z");
            await pool.query('update "user" set data_reset_at=$1 where id=$2', [
                resetAt,
                "existing-learner",
            ]);
            await pool.query(
                "delete from drizzle.__drizzle_migrations where created_at >= $1",
                [repair.when],
            );
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            expect(
                (
                    await context.internalAdapter.findSession(
                        "existing-session-test-token",
                    )
                ).user.dataResetAt,
            ).toEqual(resetAt);
            expect((await pool.query("select * from session")).rows).toEqual(
                sessionsBefore,
            );
            expect(
                (
                    await pool.query(
                        "select count(*)::int n from drizzle.__drizzle_migrations where created_at=$1",
                        [repair.when],
                    )
                ).rows[0].n,
            ).toBe(1);
        } finally {
            await pool.end();
            await rm(folder, { recursive: true, force: true });
        }
    },
    30000,
);
