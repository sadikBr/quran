import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
    readFileSync(
        new URL(
            "../src/features/groups/server/meeting-attendance.ts",
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

async function close({
    joined = false,
    finalized = false,
    next = new Date("2026-10-07T12:00:00Z"),
} = {}) {
    const writes = [];
    const schema = Object.fromEntries(
        [
            "groupMeeting",
            "groupMeetingSession",
            "groupMeetingAttendance",
            "groupMember",
            "practiceAssignment",
        ].map((name) => [
            name,
            new Proxy(
                { name },
                { get: (obj, key) => obj[key] ?? `${name}.${String(key)}` },
            ),
        ]),
    );
    const current = {
        id: "session",
        scheduledStartsAt: new Date("2026-09-30T12:00:00Z"),
        scheduledEndsAt: new Date("2026-09-30T15:00:00Z"),
        finalizedAt: finalized ? new Date() : null,
    };
    const tx = {
        select: () => ({
            from: (table) => ({
                where: () =>
                    table === schema.groupMeetingSession
                        ? { for: async () => [current] }
                        : Promise.resolve([
                              {
                                  joinedAt: joined
                                      ? current.scheduledStartsAt
                                      : null,
                              },
                          ]),
            }),
        }),
        update: (table) => ({
            set: (values) => ({
                where: async () => writes.push({ table: table.name, values }),
            }),
        }),
    };
    const db = {
        select: () => ({
            from: () => ({
                innerJoin: () => ({
                    where: async () => [
                        { id: "session", groupId: "group", hostUserId: "host" },
                    ],
                }),
            }),
        }),
        transaction: (fn) => fn(tx),
    };
    const modules = {
        "server-only": {},
        "drizzle-orm": Object.fromEntries(
            ["and", "eq", "isNull", "lte"].map((name) => [
                name,
                (...args) => args,
            ]),
        ),
        "@/drizzle/db": { default: db, __esModule: true },
        "@/drizzle/schema": schema,
        "./get-group-meeting": { getGroupMeetingForUser: async () => ({}) },
        "./revision-meeting": { getRevisionMeetingDate: () => next },
    };
    const context = {
        exports: {},
        require: (name) => {
            if (!(name in modules)) throw new Error(name);
            return modules[name];
        },
        Date,
    };
    vm.runInNewContext(source, context);
    await context.exports.finalizeEndedMeetingAttendance(
        new Date("2026-09-30T15:01:00Z"),
    );
    return writes;
}

test("absent supervisor cancels and moves work without resetting it or marking absences", async () => {
    const writes = await close();
    assert.deepEqual(Object.keys(writes[0].values).sort(), [
        "dueAt",
        "updatedAt",
    ]);
    assert.equal(writes[0].table, "practiceAssignment");
    assert.ok(writes.at(-1).values.cancelledAt);
    assert.equal(
        writes.some((write) => write.table === "groupMeetingAttendance"),
        false,
    );
});
test("supervisor who joined then left gets normal closure", async () => {
    const writes = await close({ joined: true });
    assert.equal(writes[0].values.status, "pending");
    assert.equal(writes.at(-1).values.cancelledAt, null);
    assert.equal(
        writes.some((write) => write.table === "practiceAssignment"),
        false,
    );
});
test("already finalized occurrence is left untouched", async () => {
    assert.equal((await close({ finalized: true })).length, 0);
});
test("missing next schedule still cancels without altering assignments", async () => {
    const writes = await close({ next: null });
    assert.equal(writes.length, 1);
    assert.ok(writes[0].values.cancelledAt);
});
