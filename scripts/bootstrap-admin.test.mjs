import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapAdmin } from "./bootstrap-admin.mjs";

const environment = {
    PLATFORM_ADMIN_EMAIL: "Owner@Example.com",
    PLATFORM_ADMIN_NAME: "Platform owner",
    PLATFORM_ADMIN_PASSWORD: "test-only-password-long-enough",
};

function database({
    admin = false,
    conflict = false,
    failInsert = false,
} = {}) {
    const calls = [];
    return {
        calls,
        async query(sql, values) {
            calls.push({ sql, values });
            if (sql.includes("WHERE role")) return { rowCount: Number(admin) };
            if (sql.includes("lower(email)"))
                return { rowCount: Number(conflict) };
            if (failInsert && sql.startsWith("INSERT INTO account"))
                throw new Error("simulated write failure");
            return { rowCount: 1 };
        },
    };
}

test("first setup creates dedicated admin, credential account and disabled learning notifications", async () => {
    const db = database();
    const result = await bootstrapAdmin(db, environment, async (password) => {
        assert.equal(password, environment.PLATFORM_ADMIN_PASSWORD);
        return "hashed-password";
    });
    assert.equal(result, "created");
    assert.match(db.calls[1].sql, /pg_advisory_xact_lock/);
    const insert = db.calls.find((call) =>
        call.sql.startsWith('INSERT INTO "user"'),
    );
    assert.equal(insert.values[2], "owner@example.com");
    assert.equal(insert.values[3], "admin");
    const account = db.calls.find((call) =>
        call.sql.startsWith("INSERT INTO account"),
    );
    assert.equal(account.values[1], insert.values[0]);
    assert.equal(account.values[2], "credential");
    assert.equal(account.values[3], "hashed-password");
    assert.match(
        db.calls.find((call) =>
            call.sql.startsWith("INSERT INTO user_settings"),
        ).sql,
        /false, false, false/,
    );
    assert.equal(db.calls.at(-1).sql, "COMMIT");
});

test("rerun never changes credentials, even without bootstrap secrets", async () => {
    const db = database({ admin: true });
    assert.equal(
        await bootstrapAdmin(db, {}, () => {
            throw new Error("must not hash");
        }),
        "exists",
    );
    assert.equal(
        db.calls.some((call) => /INSERT|UPDATE/.test(call.sql)),
        false,
    );
});

test("existing ordinary accounts are never promoted", async () => {
    const db = database({ conflict: true });
    await assert.rejects(bootstrapAdmin(db, environment), /already belongs/);
    assert.equal(db.calls.at(-1).sql, "ROLLBACK");
    assert.equal(
        db.calls.some((call) => /INSERT|UPDATE/.test(call.sql)),
        false,
    );
});

test("missing or weak initial credentials fail without creating an account", async () => {
    for (const values of [
        {},
        { ...environment, PLATFORM_ADMIN_PASSWORD: "short" },
        { ...environment, PLATFORM_ADMIN_EMAIL: "invalid" },
    ]) {
        const db = database();
        await assert.rejects(bootstrapAdmin(db, values), /Set PLATFORM_ADMIN/);
        assert.equal(db.calls.at(-1).sql, "ROLLBACK");
    }
});

test("preview refuses to connect or mutate, even with complete credentials", async () => {
    const db = database();
    await assert.rejects(
        bootstrapAdmin(db, { ...environment, VERCEL_ENV: "preview" }),
        /disabled/,
    );
    assert.deepEqual(db.calls, []);
});

test("partial bootstrap is rolled back", async () => {
    const db = database({ failInsert: true });
    await assert.rejects(
        bootstrapAdmin(db, environment, async () => "hash"),
        /simulated/,
    );
    assert.equal(db.calls.at(-1).sql, "ROLLBACK");
});
