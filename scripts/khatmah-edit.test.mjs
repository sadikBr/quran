import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { khatmahPlanSchema } from "../src/features/khatmah/types";

const input = {
    mode: "edit",
    durationWeeks: 8,
    repeatable: true,
    startSurah: 1,
    measurement: "page",
};
function setup(options = {}) {
    const calls = [];
    const plan = {
        durationWeeks: 8,
        targetDate: "2026-11-01",
        completedAt: null,
        isActive: false,
        currentGlobalAyah: 150,
        cycleReadingDays: 12,
        ...options.plan,
    };
    const tables = Object.fromEntries(
        ["user", "userWird", "userKhatmahPlan", "userWirdHistory"].map(
            (name) => [
                name,
                new Proxy(
                    { name },
                    { get: (obj, key) => (key === "name" ? obj.name : key) },
                ),
            ],
        ),
    );
    const tx = {
        select: () => ({
            from: (table) => ({
                where: () => ({
                    orderBy: () => ({
                        limit: async () =>
                            options.historyCompletion
                                ? [
                                      {
                                          completedAt: new Date(
                                              options.historyCompletion,
                                          ),
                                      },
                                  ]
                                : [],
                    }),
                    for: async () => {
                        calls.push({ lock: table.name });
                        return table.name === "userKhatmahPlan"
                            ? options.noPlan
                                ? []
                                : [plan]
                            : table.name === "userWird"
                              ? [
                                    {
                                        completedAt: options.completedToday
                                            ? new Date("2026-10-01T12:00:00Z")
                                            : null,
                                        ...options.wird,
                                    },
                                ]
                              : [{ id: "user" }];
                    },
                }),
            }),
        }),
        update: (table) => ({
            set: (values) => ({
                where: async () => {
                    calls.push({ table: table.name, values });
                },
            }),
        }),
        insert: (table) => ({
            values: (values) => ({
                onConflictDoUpdate: async ({ set }) => {
                    calls.push({ table: table.name, values, set });
                },
            }),
        }),
    };
    const modules = {
        "drizzle-orm": { eq: (...args) => args, desc: (value) => value },
        "next/cache": { revalidatePath: () => {} },
        "next/headers": { headers: async () => ({}) },
        "@/drizzle/db": { transaction: async (fn) => fn(tx) },
        "@/drizzle/schema": tables,
        "@/features/auth/auth": {
            auth: {
                api: { getSession: async () => ({ user: { id: "user" } }) },
            },
        },
        "@/features/quran/server/get-surahs-meta": async () => [
            { number: 1, numberOfAyahs: 7 },
            { number: 2, numberOfAyahs: 286 },
        ],
        "@/features/quran/server/get-quran-navigation-meta": async () => ({}),
        "@/features/wird/server/wird-date": (value) =>
            value ? value.toISOString().slice(0, 10) : "2026-10-01",
        "../types": { khatmahPlanSchema },
        "./calculate-khatmah": {
            shiftDate: (date, days) =>
                new Date(
                    new Date(`${date}T12:00:00Z`).getTime() + days * 86400000,
                )
                    .toISOString()
                    .slice(0, 10),
            buildAdaptiveKhatmahTarget: (values, date) => ({
                amount: 4,
                startGlobalAyah: values.currentGlobalAyah,
                endGlobalAyah: values.currentGlobalAyah + 20,
                scheduledDate: date,
            }),
        },
    };
    const exports = {};
    const compiled = ts.transpileModule(
        readFileSync(
            "src/features/khatmah/server/update-khatmah-plan.ts",
            "utf8",
        ),
        {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.CommonJS,
                esModuleInterop: true,
            },
        },
    ).outputText;
    vm.runInNewContext(compiled, { exports, require: (key) => modules[key] });
    return { action: exports.default, calls };
}
test("ordinary edit preserves current portion, progress, cycle and pause state", async () => {
    const { action, calls } = setup();
    expect((await action(input)).success).toBe(true);
    expect(calls.filter((call) => call.table)).toEqual([
        {
            table: "userKhatmahPlan",
            values: {
                durationWeeks: 8,
                targetDate: "2026-11-01",
                measurement: "page",
                repeatable: true,
                restDays: [],
            },
        },
    ]);
    expect(calls.filter((call) => call.lock).map((call) => call.lock)).toEqual([
        "user",
        "userWird",
        "userKhatmahPlan",
    ]);
});
test("duration change changes deadline, not reading progress", async () => {
    const { action, calls } = setup();
    await action({ ...input, durationWeeks: 2 });
    expect(calls.find((call) => call.table).values.targetDate).toBe(
        "2026-10-15",
    );
});
test("restart needs explicit confirmation and create cannot overwrite an existing plan", async () => {
    for (const mode of ["restart", "create"]) {
        const { action, calls } = setup();
        expect((await action({ ...input, mode })).success).toBe(false);
        expect(calls.some((call) => call.table)).toBe(false);
    }
});
test("confirmed restart resets only the new cycle and portion", async () => {
    const { action, calls } = setup({ completedToday: true });
    expect(
        (
            await action({
                ...input,
                mode: "restart",
                confirmRestart: true,
                startSurah: 2,
            })
        ).success,
    ).toBe(true);
    expect(
        calls.find((call) => call.table === "userKhatmahPlan").set
            .currentGlobalAyah,
    ).toBe(8);
    expect(calls.find((call) => call.table === "userWird").set.targetDate).toBe(
        "2026-10-02",
    );
});
test("missing and completed plans cannot be edited", async () => {
    for (const options of [
        { noPlan: true },
        { plan: { completedAt: new Date() } },
    ]) {
        const { action, calls } = setup(options);
        expect((await action(input)).success).toBe(false);
        expect(calls.some((call) => call.table)).toBe(false);
    }
});
test("pause/resume never rebuilds the portion and viewing never writes a deadline", () => {
    const toggle = readFileSync(
        "src/features/khatmah/server/toggle-khatmah-plan.ts",
        "utf8",
    );
    expect(toggle).not.toContain("userWird");
    expect(toggle).toContain(".set({ isActive })");
    expect(
        readFileSync("src/features/khatmah/server/get-khatmah-plan.ts", "utf8"),
    ).not.toContain(".update(");
});

test("repeated restart after today's completion keeps scheduling tomorrow", async () => {
    const { action, calls } = setup({
        historyCompletion: "2026-10-01T12:00:00Z",
    });
    for (const durationWeeks of [4, 8, 2]) {
        expect(
            (
                await action({
                    ...input,
                    mode: "restart",
                    confirmRestart: true,
                    durationWeeks,
                })
            ).success,
        ).toBe(true);
    }
    const portions = calls.filter((call) => call.table === "userWird");
    expect(portions).toHaveLength(3);
    expect(portions.every((call) => call.set.targetDate === "2026-10-02")).toBe(
        true,
    );
});

test("yesterday's completion does not postpone today's new khatma", async () => {
    const { action, calls } = setup({
        historyCompletion: "2026-09-30T12:00:00Z",
    });
    await action({ ...input, mode: "restart", confirmRestart: true });
    expect(calls.find((call) => call.table === "userWird").set.targetDate).toBe(
        "2026-10-01",
    );
});

test("editing recalculates an unstarted future portion without changing its date or progress", async () => {
    const { action, calls } = setup({
        plan: { isActive: true },
        wird: {
            targetDate: "2026-10-02",
            progressGlobalAyah: null,
            progressVerse: null,
        },
    });
    await action({ ...input, measurement: "hizb" });
    const update = calls.find((call) => call.table === "userWird");
    expect(update.values).toEqual({
        unit: "hizb",
        amount: 4,
        targetStartGlobalAyah: 150,
        targetEndGlobalAyah: 170,
    });
});

test("editing preserves today's portion and any saved future progress", async () => {
    for (const wird of [
        { targetDate: "2026-10-01" },
        { targetDate: "2026-10-02", progressGlobalAyah: 155 },
        {
            targetDate: "2026-10-02",
            progressVerse: { surahNumber: 2, ayahNumber: 5 },
        },
    ]) {
        const { action, calls } = setup({ plan: { isActive: true }, wird });
        await action(input);
        expect(calls.some((call) => call.table === "userWird")).toBe(false);
    }
});
