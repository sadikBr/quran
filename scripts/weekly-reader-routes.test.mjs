import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import vm from "node:vm";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";

function load(path, overrides = {}) {
    const exports = {};
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
        fileName: path,
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
        },
    }).outputText;
    const modules = {
        "react/jsx-runtime": jsx,
        "next/navigation": {
            notFound() {
                throw new Error("not-found");
            },
        },
        "@/lib/quran-info": { minSurahNumber: 1, maxSurahNumber: 114 },
        "@/features/quran/components/quran-audio-shell": "AudioShell",
        "@/features/quran/components/ayah-actions-modal": "AyahModal",
        "@/features/quran/components/ayah-actions-content": "AyahContent",
        "@/features/quran/components/ayah-actions-loading": "AyahLoading",
        ...overrides,
    };
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name in modules) return modules[name];
            throw new Error(`Unexpected import: ${name}`);
        },
    });
    return exports.default;
}
const interception = "@ayah/(...)quran/ayah/[surahNumber]/[ayahNumber]";

test("both Practice readers register matching routes and share the ayah modal", () => {
    const routes = (kind) =>
        readdirSync(`src/app/practice/${kind}/[sessionId]`, { recursive: true })
            .filter((path) => path.endsWith(".tsx"))
            .sort();
    expect(routes("memorization")).toEqual(routes("revision"));
    expect(routes("memorization")).toContain("read/page.tsx");
    expect(routes("memorization")).toContain("read/loading.tsx");
    const shared = readdirSync("src/app/practice/@ayah", { recursive: true });
    expect(shared).toContain(
        "(...)quran/ayah/[surahNumber]/[ayahNumber]/page.tsx",
    );
    expect(shared).toContain(
        "(...)quran/ayah/[surahNumber]/[ayahNumber]/loading.tsx",
    );
    expect(shared).toContain("default.tsx");
    expect(shared).toContain("[...catchAll]/page.tsx");
});

test("Practice readers share the audio provider and ayah interception", () => {
    const tree = load("src/app/practice/layout.tsx")({
        children: "reader",
        ayah: "overlay",
    });
    expect(tree.type).toBe("AudioShell");
    expect(tree.props.children).toEqual(["reader", "overlay"]);
    expect(load("src/app/practice/@ayah/default.tsx")()).toBeNull();
    expect(load("src/app/practice/@ayah/[...catchAll]/page.tsx")()).toBeNull();
});

test("Practice ayah modal uses the plan riwayah without looking up an unrelated personal range", async () => {
    const calls = [];
    const page = load(`src/app/practice/${interception}/page.tsx`, {
        "next/headers": { headers: async () => ({}) },
        "@/features/auth/auth": {
            auth: {
                api: { getSession: async () => ({ user: { id: "owner" } }) },
            },
        },
        "@/features/practice/server/get-practice-assignment": async (
            user,
            id,
        ) => {
            calls.push([user, id]);
            return { riwayah: "hafs" };
        },
    });
    const run = (searchParams) =>
        page({
            params: Promise.resolve({ surahNumber: "2", ayahNumber: "141" }),
            searchParams: Promise.resolve(searchParams),
        });
    for (const riwayah of ["hafs", "warsh", "invalid", undefined]) {
        const tree = await run({ riwayah });
        expect(tree.type).toBe("AyahModal");
        expect(tree.props.children.type).toBe("AyahContent");
        expect(tree.props.children.props).toEqual({
            surahNumber: 2,
            ayahNumber: 141,
            closeOnCopy: true,
            riwayah: riwayah === "invalid" ? undefined : riwayah,
        });
    }
    expect(calls).toEqual([]);
    expect(
        (await run({ practice: "owned-range", riwayah: "warsh" })).props
            .children.props.riwayah,
    ).toBe("hafs");
    expect(calls).toEqual([["owner", "owned-range"]]);
    for (const [surahNumber, ayahNumber] of [
        ["0", "1"],
        ["115", "1"],
        ["1.5", "1"],
        ["2", "0"],
        ["2", "NaN"],
    ]) {
        await expect(
            page({
                params: Promise.resolve({ surahNumber, ayahNumber }),
                searchParams: Promise.resolve({}),
            }),
        ).rejects.toThrow("not-found");
    }
    const loading = load(`src/app/practice/${interception}/loading.tsx`)();
    expect(loading.type).toBe("AyahModal");
    expect(loading.props.children.type).toBe("AyahLoading");
});
