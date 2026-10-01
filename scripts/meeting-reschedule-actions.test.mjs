import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import * as schedule from "../src/features/groups/server/meeting-schedule";

const now = new Date("2026-10-01T10:00:00Z");
class Clock extends Date {
    constructor(...args) {
        super(...(args.length ? args : [now.getTime()]));
    }
    static now() {
        return now.getTime();
    }
}
const meeting = {
    id: "meeting",
    enabled: true,
    timezone: "UTC",
    activeWindowMinutes: 180,
    schedule: [{ weekday: 3, localTime: "20:00" }],
    rescheduledOccurrences: [],
};
function setup(file, options = {}) {
    const calls = [];
    const tables = Object.fromEntries(
        [
            "groupMeeting",
            "groupMeetingSchedule",
            "groupMeetingSession",
            "groupMember",
            "memorizationGroup",
            "practiceAssignment",
        ].map((name) => [
            name,
            new Proxy(
                { name },
                { get: (target, key) => (key === "name" ? target.name : key) },
            ),
        ]),
    );
    const rows = (table) => {
        switch (table.name) {
            case "groupMember":
                return options.unauthorized
                    ? []
                    : [{ id: "member", role: "supervisor" }];
            case "memorizationGroup":
                return [{ id: "group" }];
            case "groupMeeting":
                return [{ id: "meeting" }];
            case "groupMeetingSession":
                return options.started
                    ? [{ id: "occurrence", startedAt: now }]
                    : [];
            case "practiceAssignment":
                return [
                    {
                        id: "assignment",
                        dueAt: new Date("2026-10-07T20:00:00.000Z"),
                    },
                ];
            default:
                return [];
        }
    };
    const db = {
        select: () => ({
            from: (table) => {
                const chain = {
                    where: () => chain,
                    limit: () => chain,
                    orderBy: () => chain,
                    for: () => {
                        calls.push({ lock: table.name });
                        return chain;
                    },
                    // biome-ignore lint/suspicious/noThenProperty: emulate Drizzle awaitable builders.
                    then: (resolve) => resolve(rows(table)),
                };
                return chain;
            },
        }),
        update: (table) => ({
            set: (values) => ({
                where: async () => calls.push({ table: table.name, values }),
            }),
        }),
        delete: (table) => ({
            where: async () => calls.push({ delete: table.name }),
        }),
        insert: (table) => ({
            values: async (values) =>
                calls.push({ insert: table.name, values }),
        }),
        transaction: async (fn) => fn(db),
    };
    const modules = {
        zod: { z },
        "drizzle-orm": Object.fromEntries(
            ["and", "eq", "gt", "inArray", "isNull", "asc"].map((name) => [
                name,
                (...args) => args,
            ]),
        ),
        "next/cache": { revalidatePath: () => {} },
        "next/headers": { headers: async () => ({}) },
        "@/drizzle/db": db,
        "@/drizzle/schema": tables,
        "@/features/auth/auth": {
            auth: {
                api: {
                    getSession: async () => ({ user: { id: "supervisor" } }),
                },
            },
        },
        "./get-group-meeting": { getGroupMeetingForUser: async () => meeting },
        "./meeting-schedule": {
            ...schedule,
            calculateMeetingState: (config) =>
                schedule.calculateMeetingState({ ...config, now }),
        },
    };
    const compiled = ts.transpileModule(
        readFileSync(`src/features/groups/server/${file}.ts`, "utf8"),
        {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                esModuleInterop: true,
            },
        },
    ).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require: (name) => modules[name],
        Date: Clock,
        crypto,
    });
    return { action: exports.default, calls };
}
const input = {
    groupId: "circle",
    from: "2026-10-07T20:00:00.000Z",
    to: "2026-10-09T18:00:00.000Z",
};
test("one-off move updates dates only, never readiness or progress", async () => {
    const { action, calls } = setup("reschedule-meeting");
    expect((await action(input)).success).toBe(true);
    expect(
        calls.find((call) => call.table === "practiceAssignment").values,
    ).toEqual({ dueAt: new Date(input.to), updatedAt: now });
    expect(
        calls.find((call) => call.table === "groupMeeting").values
            .rescheduledOccurrences,
    ).toEqual([{ from: input.from, to: input.to }]);
});
test("unauthorized, started, past, overlapping and stale moves write nothing", async () => {
    for (const [options, changes] of [
        [{ unauthorized: true }, {}],
        [{ started: true }, {}],
        [{}, { to: "2026-09-30T18:00:00.000Z" }],
        [{}, { to: "2026-10-14T21:00:00.000Z" }],
        [{}, { from: "2026-10-06T20:00:00.000Z" }],
    ]) {
        const { action, calls } = setup("reschedule-meeting", options);
        expect((await action({ ...input, ...changes })).success).toBe(false);
        expect(calls.some((call) => call.table)).toBe(false);
    }
});
test("weekly edit previews affected assignments and only moves them after confirmation", async () => {
    const { action, calls } = setup("save-group-meeting");
    const change = {
        groupId: "circle",
        timezone: "UTC",
        schedule: [{ weekday: 5, localTime: "18:00" }],
    };
    const preview = await action(change);
    expect({ preview, calls }).toMatchObject({
        preview: { reason: "confirmation" },
    });
    expect(preview.moves[0].count).toBe(1);
    expect(calls.some((call) => call.table || call.delete || call.insert)).toBe(
        false,
    );
    expect(
        (await action({ ...change, confirmation: preview.confirmation }))
            .success,
    ).toBe(true);
    expect(
        Object.keys(
            calls.find((call) => call.table === "practiceAssignment").values,
        ).sort(),
    ).toEqual(["dueAt", "updatedAt"]);
});
