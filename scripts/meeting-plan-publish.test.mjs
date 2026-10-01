import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

const compiled = ts.transpileModule(
    readFileSync("src/features/groups/server/save-meeting-plan.ts", "utf8"),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
        },
    },
).outputText;

async function publish(existing) {
    const calls = [];
    const column = new Proxy({}, { get: (_, key) => key });
    const tx = {
        select: () => ({
            from: () => ({
                where: () => ({
                    for: async () => {
                        calls.push("lock");
                        return [{ id: "circle" }];
                    },
                    limit: async () => {
                        calls.push("check");
                        return existing ? [{ id: "existing" }] : [];
                    },
                }),
            }),
        }),
        delete: () => ({ where: async () => calls.push("delete-drafts") }),
        insert: () => ({ values: async () => calls.push("insert") }),
    };
    const db = {
        select: () => ({
            from: () => ({
                leftJoin: () => ({
                    where: async () => [
                        {
                            userId: "supervisor",
                            role: "supervisor",
                            riwayah: "hafs",
                        },
                    ],
                }),
            }),
        }),
        transaction: async (fn) => fn(tx),
    };
    const modules = {
        zod: { z },
        "drizzle-orm": Object.fromEntries(
            ["and", "eq", "inArray", "isNull", "lt", "ne", "or"].map((key) => [
                key,
                (...args) => args,
            ]),
        ),
        "@/drizzle/db": db,
        "@/drizzle/schema": {
            groupMember: column,
            memorizationGroup: column,
            practiceAssignment: column,
            userSettings: column,
        },
        "next/cache": { revalidatePath: () => {} },
        "next/headers": { headers: async () => ({}) },
        "next/server": { after: () => {} },
        "@/features/auth/auth": {
            auth: {
                api: {
                    getSession: async () => ({ user: { id: "supervisor" } }),
                },
            },
        },
        "@/features/groups/server/get-group-meeting": {
            getGroupMeetingForUser: async () => ({}),
        },
        "@/features/groups/server/meeting-schedule": {
            getUpcomingMeetingOccurrences: () => ["2026-10-07T12:00:00.000Z"],
        },
        "@/features/practice/types": {
            PRACTICE_KINDS: ["memorization"],
            quranReferenceSchema: z.object({
                surahNumber: z.number(),
                ayahNumber: z.number(),
            }),
            referenceOrder: (ref) => ref.surahNumber * 1000 + ref.ayahNumber,
        },
        "@/features/quran/server/get-surahs-meta": async () => [
            { number: 1, numberOfAyahs: 7 },
        ],
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require: (name) => modules[name] ?? {},
        crypto,
        Date,
    });
    const result = await exports.default({
        groupId: "circle",
        dueMeetingStartsAt: "2026-10-07T12:00:00.000Z",
        mode: "publish",
        entries: [
            {
                assigneeId: "supervisor",
                kind: "memorization",
                start: { surahNumber: 1, ayahNumber: 1 },
                end: { surahNumber: 1, ayahNumber: 7 },
            },
        ],
    });
    return { result, calls };
}

test("repeat publication is rejected under lock without deleting or inserting assignments", async () => {
    const { result, calls } = await publish(true);
    expect(result.reason).toBe("already_planned");
    expect(calls).toEqual(["lock", "check"]);
});
test("new publication checks existing work under lock before writing", async () => {
    const { result, calls } = await publish(false);
    expect(result.success).toBe(true);
    expect(calls).toEqual(["lock", "check", "delete-drafts", "insert"]);
});
