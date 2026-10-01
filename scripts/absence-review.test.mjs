import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

const source = ts.transpileModule(
    readFileSync(
        new URL(
            "../src/features/groups/server/review-meeting-absence.ts",
            import.meta.url,
        ),
        "utf8",
    ),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
        },
    },
).outputText;

async function review({
    status = "pending",
    excuse = null,
    expectedExcuse = null,
    confirmRemoval = false,
    streak = false,
    authorized = true,
    decision = "unaccepted",
    changed = false,
} = {}) {
    const writes = [];
    const responses = [
        authorized ? [{ id: "supervisor" }] : [],
        [
            {
                userId: "member",
                status,
                excuse,
                role: "member",
                hostUserId: "host",
                membershipStartedAt: null,
            },
        ],
        [
            { id: "current", status },
            ...(streak
                ? [
                      { id: "older1", status: "unaccepted" },
                      { id: "older2", status: "unaccepted" },
                  ]
                : []),
        ],
    ];
    const chain = (rows) => {
        const query = Promise.resolve(rows);
        for (const method of [
            "from",
            "innerJoin",
            "leftJoin",
            "where",
            "limit",
            "orderBy",
            "for",
        ])
            query[method] = () => query;
        return query;
    };
    const db = {
        select: () => chain(responses.shift()),
        transaction: (fn) => fn(db),
        update: () => ({
            set: (values) => ({
                where: () => ({
                    returning: async () => {
                        if (changed) return [];
                        writes.push(values);
                        return [{ id: "current" }];
                    },
                }),
            }),
        }),
        delete: () => ({
            where: async () => {
                writes.push("removed");
            },
        }),
    };
    const schema = Object.fromEntries(
        [
            "groupMeeting",
            "groupMeetingAttendance",
            "groupMeetingSession",
            "groupMember",
        ].map((name) => [
            name,
            new Proxy({}, { get: (_, field) => `${name}.${String(field)}` }),
        ]),
    );
    const modules = {
        "drizzle-orm": Object.fromEntries(
            ["and", "desc", "eq", "gte", "isNotNull", "isNull"].map((name) => [
                name,
                (...args) => [name, ...args],
            ]),
        ),
        "next/cache": { revalidatePath() {} },
        "next/headers": { headers: async () => ({}) },
        zod: { z },
        "@/drizzle/db": db,
        "@/drizzle/schema": schema,
        "@/features/auth/auth": {
            auth: {
                api: {
                    getSession: async () => ({ user: { id: "supervisor" } }),
                },
            },
        },
    };
    const context = {
        exports: {},
        require: (name) => {
            assert.ok(name in modules, name);
            return modules[name];
        },
    };
    vm.runInNewContext(source, context);
    const result = await context.exports.default({
        groupId: "circle",
        attendanceId: "current",
        decision,
        expectedExcuse,
        confirmRemoval,
    });
    return { result, writes };
}

test("third rejection requires an explicit removal confirmation before any write", async () => {
    const { result, writes } = await review({ streak: true });
    assert.equal(result.reason, "removal_confirmation");
    assert.equal(writes.length, 0);
});
test("confirmed third rejection saves and removes the member", async () => {
    const { result, writes } = await review({
        streak: true,
        confirmRemoval: true,
    });
    assert.equal(result.removed, true);
    assert.equal(writes.at(-1), "removed");
});
test("accepted excuse breaks the absence streak without removal", async () => {
    const { result, writes } = await review({
        streak: true,
        decision: "accepted",
    });
    assert.equal(result.success, true);
    assert.equal(result.removed, false);
    assert.equal(writes.length, 1);
});
test("changed explanations and finalized decisions are never overwritten", async () => {
    for (const options of [
        { excuse: "Updated explanation" },
        { status: "accepted" },
        { status: "unaccepted" },
        { authorized: false },
        { changed: true },
    ]) {
        const { result, writes } = await review(options);
        assert.equal(result.success, false);
        assert.equal(writes.length, 0);
    }
});
