import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

export function assertSetupEnvironment(environment) {
    if (environment.VERCEL_ENV && environment.VERCEL_ENV !== "production") {
        throw new Error(
            "Database setup is disabled in Vercel preview/development deployments.",
        );
    }
}

export async function bootstrapAdmin(client, environment, hash = hashPassword) {
    assertSetupEnvironment(environment);
    await client.query("BEGIN");
    try {
        await client.query("SELECT pg_advisory_xact_lock(214701, 1)");
        const existing = await client.query(
            'SELECT id FROM "user" WHERE role = $1 LIMIT 1',
            ["admin"],
        );
        if (existing.rowCount) {
            await client.query("COMMIT");
            return "exists";
        }
        const email = environment.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
        const name = environment.PLATFORM_ADMIN_NAME?.trim();
        const password = environment.PLATFORM_ADMIN_PASSWORD;
        if (
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            !name ||
            name.length > 100 ||
            !password ||
            password.length < 16 ||
            password.length > 128
        ) {
            throw new Error(
                "Set PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_NAME and a 16–128 character PLATFORM_ADMIN_PASSWORD before the first setup.",
            );
        }
        const conflict = await client.query(
            'SELECT id FROM "user" WHERE lower(email) = $1 LIMIT 1',
            [email],
        );
        if (conflict.rowCount)
            throw new Error(
                "The bootstrap email already belongs to an account. Choose a dedicated admin email; existing users are never promoted automatically.",
            );
        const userId = randomUUID();
        const passwordHash = await hash(password);
        await client.query(
            'INSERT INTO "user" (id, name, email, email_verified, role) VALUES ($1, $2, $3, false, $4)',
            [userId, name, email, "admin"],
        );
        await client.query(
            "INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES ($1, $2, $3, $2, $4)",
            [randomUUID(), userId, "credential", passwordHash],
        );
        await client.query(
            "INSERT INTO user_settings (user_id, wird_reminders_enabled, meeting_reminders_enabled, assignment_reminders_enabled) VALUES ($1, false, false, false)",
            [userId],
        );
        await client.query("COMMIT");
        return "created";
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
}

async function main() {
    nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
    const environment = process.env;
    if (environment.VERCEL_ENV && environment.VERCEL_ENV !== "production")
        throw new Error("Admin setup is disabled outside Vercel production.");
    for (const field of [
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
    ]) {
        if (!environment[field]) throw new Error(`Missing ${field}.`);
    }
    const client = new pg.Client({
        host: environment.DB_HOST,
        port: Number(environment.DB_PORT),
        database: environment.DB_NAME,
        user: environment.DB_USER,
        password: environment.DB_PASSWORD,
        connectionTimeoutMillis: 10000,
    });
    await client.connect();
    try {
        const status = await bootstrapAdmin(client, environment);
        console.log(
            status === "created"
                ? "Platform admin created. Sign in using the configured credentials."
                : "Platform admin already exists; credentials were not changed.",
        );
    } finally {
        await client.end();
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    main().catch((error) => {
        // Do not print query values, connection strings or credential-bearing errors.
        console.error(
            error instanceof Error && !("severity" in error)
                ? error.message
                : "Admin setup failed. Check database connectivity and apply the schema first.",
        );
        process.exitCode = 1;
    });
}
