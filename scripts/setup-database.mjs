import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";
import { assertSetupEnvironment } from "./bootstrap-admin.mjs";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
try {
    // Guard the migration too, not only the account bootstrap that follows it.
    assertSetupEnvironment(process.env);
    for (const field of [
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
    ]) {
        if (!process.env[field]) throw new Error(`Missing ${field}.`);
    }
    for (const args of [
        ["node_modules/drizzle-kit/bin.cjs", "migrate"],
        ["scripts/bootstrap-admin.mjs"],
    ]) {
        const result = spawnSync(process.execPath, args, {
            stdio: "inherit",
            env: process.env,
        });
        if (result.error || result.status !== 0) {
            process.exitCode = result.status || 1;
            break;
        }
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
