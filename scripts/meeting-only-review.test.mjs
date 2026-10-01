import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

const file = (path) => readFileSync(`src/${path}`, "utf8");
const compiled = ts.transpileModule(
    file("features/groups/server/review-member-assignment.ts"),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
        },
    },
).outputText;
const input = {
    groupId: "circle",
    assignmentId: "assignment",
    occurrence: "2026-10-10T12:00:00.000Z",
    decision: "completed",
    note: "Well recited",
};
function setup(options = {}) {
    const calls = [];
    const context = { id: "session", startsAt: new Date(input.occurrence) };
    const tx = {
        select: () => ({
            from: () => ({
                where: () => ({
                    for: (lock) => {
                        calls.push(["assignmentLock", lock]);
                        return Promise.resolve(
                            options.absentMember
                                ? []
                                : [{ dueAt: new Date("2026-10-01") }],
                        );
                    },
                }),
            }),
        }),
        update: () => ({
            set: (values) => {
                calls.push(["save", values]);
                return {
                    where: () => ({
                        returning: async () =>
                            options.closedDuringSave
                                ? []
                                : [{ id: "assignment" }],
                    }),
                };
            },
        }),
    };
    const column = new Proxy({}, { get: (_, name) => String(name) });
    const modules = {
        "drizzle-orm": {
            and: (...v) => v,
            eq: (...v) => v,
            inArray: (...v) => v,
            sql: (parts, ...values) => ({ parts, values }),
        },
        "next/cache": { revalidatePath: () => {} },
        "next/headers": { headers: async () => ({}) },
        "next/server": { after: () => {} },
        zod: { z },
        "@/drizzle/db": { transaction: async (fn) => fn(tx) },
        "@/drizzle/schema": {
            practiceAssignment: column,
            groupMeetingSession: column,
        },
        "@/features/auth/auth": {
            auth: {
                api: {
                    getSession: async () => ({ user: { id: "supervisor" } }),
                },
            },
        },
        "@/features/notifications/server/assignment-notifications": {
            sendAssignmentNotification: async () => {},
        },
        "./get-group-meeting": {
            getGroupMeetingForUser: async () => ({ id: "meeting" }),
        },
        "./get-review-queue": async () => [],
        "./live-review-context": {
            getLiveReviewContext: async (...args) => {
                calls.push(["context", ...args]);
                return options.noLiveContext ? null : context;
            },
            attendedAssignment: (...args) => {
                calls.push(["attendance", ...args]);
                return "attended";
            },
        },
        "./revision-meeting": {
            getRevisionMeetingDate: (_, after) => {
                calls.push(["nextMeeting", after]);
                return options.noNext ? null : new Date("2026-10-17T12:00:00Z");
            },
        },
    };
    const sandbox = {
        exports: {},
        require: (name) => {
            if (!(name in modules)) throw new Error(name);
            return modules[name];
        },
    };
    vm.runInNewContext(compiled, sandbox);
    return { action: sandbox.exports.default, calls, tx };
}
test("no live attended session means no evaluation", async () => {
    const { action, calls } = setup({ noLiveContext: true });
    expect((await action(input)).reason).toBe("meeting_required");
    expect(calls.some(([name]) => name === "save")).toBe(false);
});
test("missing meeting identity rejects old standalone clients", async () => {
    const { action, calls } = setup();
    expect((await action({ ...input, occurrence: undefined })).success).toBe(
        false,
    );
    expect(calls).toHaveLength(0);
});
test("members absent from the session cannot be evaluated", async () => {
    const { action, calls } = setup({ absentMember: true });
    expect((await action(input)).success).toBe(false);
    expect(calls.some(([name]) => name === "save")).toBe(false);
});
test("allowed review locks the session and filters for an attended member", async () => {
    const { action, calls, tx } = setup();
    expect((await action(input)).success).toBe(true);
    const check = calls.find(([name]) => name === "context");
    expect(check.slice(1, 4)).toEqual([
        "circle",
        "supervisor",
        input.occurrence,
    ]);
    expect(check[4]).toBe(tx);
    expect(check[5]).toBe(true);
    expect(calls.find(([name]) => name === "attendance")[1]).toBe("session");
    expect(
        calls
            .find(([name]) => name === "save")[1]
            .reviewedForDueAt.toISOString(),
    ).toBe(input.occurrence);
});
test("carried-over revision is scheduled after the current meeting", async () => {
    const { action, calls } = setup();
    expect(
        (await action({ ...input, decision: "needs_revision" })).success,
    ).toBe(true);
    expect(
        calls.find(([name]) => name === "nextMeeting")[1].toISOString(),
    ).toBe(input.occurrence);
});
test("meeting end or missing future schedule prevents a successful save", async () => {
    expect((await setup({ closedDuringSave: true }).action(input)).reason).toBe(
        "meeting_required",
    );
    const { action, calls } = setup({ noNext: true });
    expect(
        (await action({ ...input, decision: "needs_revision" })).reason,
    ).toBe("no_next_meeting");
    expect(calls.some(([name]) => name === "save")).toBe(false);
});
test("database guard requires start, role, supervisor presence, but not member connectivity", () => {
    const source = file("features/groups/server/live-review-context.ts");
    for (const guard of [
        "startedAt",
        "endedAt",
        "finalizedAt",
        "cancelledAt",
        "scheduledEndsAt",
        "scheduledStartsAt",
        '"supervisor"',
        "activeJoinedAt",
        "lastSeenAt",
        "75 seconds",
    ])
        expect(source).toContain(guard);
    const member = source.slice(
        source.indexOf("export function attendedAssignment"),
    );
    expect(member).toContain("joinedAt} is not null");
    expect(member).not.toContain("activeJoinedAt");
});
test("standalone inspection cannot render evaluation controls and submitted work never expires", () => {
    const page = file("app/groups/[groupId]/review/[assignmentId]/page.tsx");
    expect(page).not.toContain("occurrence=");
    expect(page).not.toContain("ReviewDecisionForm");
    expect(file("features/groups/components/assignment-review.tsx")).toContain(
        "occurrence ?",
    );
    const expiry = file(
        "features/groups/server/expire-unsubmitted-assignments.ts",
    );
    expect(
        expiry.slice(
            expiry.indexOf("const eligible ="),
            expiry.indexOf("const eligible =") + 240,
        ),
    ).not.toContain('"submitted"');
});
