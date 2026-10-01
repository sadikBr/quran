import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(
    readFileSync(
        "src/features/notifications/server/assignment-notifications.ts",
        "utf8",
    ),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
        },
    },
).outputText;

async function deliver(kind, overrides = {}) {
    const messages = [];
    const assignment = {
        id: "work",
        assigneeId: "person",
        groupId: "circle",
        groupName: "Family",
        assignmentKind: "memorization",
        assigneeRole: "supervisor",
        status: "in_progress",
        dueAt: new Date(),
        reviewedAt: new Date(),
        reviewMethod: null,
        language: "en",
        remindersEnabled: true,
        ...overrides,
    };
    const responses = [
        [assignment],
        [{ id: "push", endpoint: "test", p256dh: "key", auth: "auth" }],
    ];
    const chain = (rows) => {
        const result = Promise.resolve(rows);
        for (const method of ["from", "leftJoin", "where", "limit"])
            result[method] = () => result;
        return result;
    };
    const db = {
        select: () => chain(responses.shift()),
        insert: () => ({
            values: () => ({
                onConflictDoNothing: () => ({
                    returning: async () => [{ id: "delivery" }],
                }),
            }),
        }),
        update: () => ({ set: () => ({ where: async () => {} }) }),
    };
    const column = new Proxy({}, { get: (_, key) => String(key) });
    const modules = {
        "server-only": {},
        "drizzle-orm": { and: (...v) => v, eq: (...v) => v },
        "@/drizzle/db": db,
        "@/drizzle/schema": Object.fromEntries(
            [
                "assignmentNotificationDelivery",
                "groupMember",
                "memorizationGroup",
                "practiceAssignment",
                "pushSubscription",
                "userSettings",
            ].map((key) => [key, column]),
        ),
        "./web-push": {
            configureWebPush: () => true,
            sendPushNotification: async (_, payload) =>
                messages.push(JSON.parse(payload)),
            isExpiredPushSubscription: () => false,
        },
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require: (name) => modules[name],
        crypto,
    });
    const result = await exports.sendAssignmentNotification("work", kind);
    return { result, messages };
}

test("supervisors receive their own assignment and deadline notifications", async () => {
    for (const kind of ["published", "due_soon"])
        expect((await deliver(kind)).result.sent).toBe(1);
});
test("peer reviews notify supervisors, while self-reviews do not send misleading approvals", async () => {
    expect(
        (
            await deliver("review_completed", {
                status: "completed",
                reviewMethod: "peer",
            })
        ).result.sent,
    ).toBe(1);
    for (const [kind, status] of [
        ["review_completed", "completed"],
        ["review_needs_revision", "needs_revision"],
        ["review_not_completed", "not_completed"],
    ])
        expect(
            (await deliver(kind, { status, reviewMethod: "self" })).messages,
        ).toHaveLength(0);
});
test("notification opt-out and membership removal still apply to supervisors", async () => {
    expect(
        (await deliver("published", { remindersEnabled: false })).messages,
    ).toHaveLength(0);
    expect(
        (await deliver("published", { assigneeRole: null })).messages,
    ).toHaveLength(0);
});
