import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function setup(signedIn = true) {
    const calls = [];
    const table = (name) => ({
        name,
        userId: `${name}.userId`,
        id: `${name}.id`,
    });
    const tx = {
        select: () => ({
            from: (target) => ({
                where: () => ({
                    for: async () => {
                        calls.push(["lock", target.name]);
                        return [];
                    },
                }),
            }),
        }),
        delete: (target) => ({
            where: async (condition) =>
                calls.push(["delete", target.name, condition]),
        }),
    };
    const modules = {
        "drizzle-orm": { eq: (...args) => args },
        "next/headers": { headers: async () => ({}) },
        "next/cache": { revalidatePath: () => {} },
        "@/drizzle/db": { transaction: async (fn) => fn(tx) },
        "@/drizzle/schema": {
            user: table("user"),
            userWird: table("wird"),
            userKhatmahPlan: table("plan"),
        },
        "@/features/auth/auth": {
            auth: {
                api: {
                    getSession: async () =>
                        signedIn ? { user: { id: "me" } } : null,
                },
            },
        },
    };
    const exports = {};
    vm.runInNewContext(
        ts.transpileModule(
            readFileSync(
                "src/features/khatmah/server/cancel-khatmah-plan.ts",
                "utf8",
            ),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2022,
                    esModuleInterop: true,
                },
            },
        ).outputText,
        { exports, require: (key) => modules[key] },
    );
    return { action: exports.default, calls };
}
test("ending a plan removes only the authenticated user's plan after locking reading", async () => {
    const { action, calls } = setup();
    expect((await action(true)).success).toBe(true);
    expect(calls).toEqual([
        ["lock", "user"],
        ["lock", "wird"],
        ["delete", "plan", ["plan.userId", "me"]],
    ]);
});
test("confirmation and authentication are required", async () => {
    for (const [signedIn, confirmed] of [
        [true, false],
        [false, true],
    ]) {
        const { action, calls } = setup(signedIn);
        expect((await action(confirmed)).success).toBe(false);
        expect(calls).toEqual([]);
    }
});
