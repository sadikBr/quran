import { expect, test } from "bun:test";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

function setup() {
    let row = {
        userId: "reader",
        unit: "ayah",
        amount: 10,
        targetStartGlobalAyah: 1,
        targetEndGlobalAyah: 10,
        completedAt: new Date("2026-09-30T10:00:00Z"),
        targetDate: "2026-09-30",
        progressGlobalAyah: 10,
        nextGoal: null,
        revision: "before",
    };
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    let waiting;
    const ready = new Promise((resolve) => {
        waiting = resolve;
    });
    let navigationCalls = 0;
    let writes = 0;
    const locks = [];
    const userWird = { name: "wird", userId: "userId", updatedAt: "updatedAt" };
    const userKhatmahPlan = { name: "plan", userId: "userId" };
    const db = {
        select: () => ({
            from: (table) => ({
                where: () => ({
                    limit: async () =>
                        table === userWird && row ? [{ ...row }] : [],
                    for: async () => {
                        locks.push(table.name);
                        return table === userWird && row ? [{ ...row }] : [];
                    },
                }),
            }),
        }),
        update: () => ({
            set: (values) => ({
                where: () => ({
                    returning: async () => {
                        writes++;
                        row = { ...row, ...values };
                        return [{ ...row }];
                    },
                }),
            }),
        }),
        transaction: async (callback) => callback(db),
    };
    const getDailyWird = loadTypeScript(
        "src/features/wird/server/get-daily-wird.ts",
        {
            "server-only": {},
            "drizzle-orm": {
                eq: (...args) => args,
                getTableColumns: () => ({}),
                sql: () => ({}),
            },
            "@/drizzle/db": db,
            "@/drizzle/schema": { userWird, userKhatmahPlan },
            "@/features/khatmah/server/calculate-khatmah": {
                buildAdaptiveKhatmahTarget() {
                    throw new Error("No plan");
                },
            },
            "@/features/quran/server/get-ayah": async (number) => ({
                number,
                surah: { number: 1, name: "surah", englishName: "surah" },
                numberInSurah: number,
                page: 1,
            }),
            "@/features/quran/server/get-quran-navigation-meta": async () => {
                if (++navigationCalls === 1) {
                    waiting();
                    await gate;
                }
                return {};
            },
            "@/features/quran/server/get-surahs-meta": async () => [],
            "./build-wird-target": {
                __esModule: true,
                TOTAL_QURAN_AYAHS: 6236,
                default: (_unit, amount, start) => ({
                    startGlobalAyah: start,
                    endGlobalAyah: start + amount - 1,
                }),
            },
            "./wird-date": (date) =>
                date ? date.toISOString().slice(0, 10) : "2026-10-01",
        },
    ).default;
    return {
        get: () => getDailyWird("reader", "hafs"),
        ready,
        release,
        row: () => row,
        setRow: (value) => {
            row = value;
        },
        writes: () => writes,
        locks,
    };
}

test("delayed rollover preserves a newer progress save", async () => {
    const app = setup();
    const slow = app.get();
    await app.ready;
    await app.get();
    app.row().progressGlobalAyah = 15;
    app.row().revision = "new-progress";
    app.release();
    const result = await slow;
    expect(result.progressGlobalAyah).toBe(15);
    expect(result.revision).toBe("new-progress");
    expect(app.writes()).toBe(1);
    expect(app.locks.slice(0, 2)).toEqual(["wird", "plan"]);
});

test("delayed rollover cannot reopen a portion completed today", async () => {
    const app = setup();
    const slow = app.get();
    await app.ready;
    await app.get();
    app.row().completedAt = new Date("2026-10-01T10:00:00Z");
    app.release();
    expect((await slow).completed).toBe(true);
    expect(app.writes()).toBe(1);
});

test("delayed rollover preserves a restarted plan and handles account deletion", async () => {
    for (const deleted of [false, true]) {
        const app = setup();
        const slow = app.get();
        await app.ready;
        app.setRow(
            deleted
                ? undefined
                : {
                      ...app.row(),
                      completedAt: null,
                      targetStartGlobalAyah: 1000,
                      targetEndGlobalAyah: 1020,
                  },
        );
        app.release();
        const result = await slow;
        if (deleted) expect(result).toBeNull();
        else expect(result.start.globalAyahNumber).toBe(1000);
        expect(app.writes()).toBe(0);
    }
});
