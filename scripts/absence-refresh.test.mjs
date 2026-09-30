import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(
    readFileSync("src/features/groups/components/absence-excuse.tsx", "utf8"),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
        },
    },
).outputText;

function mount(pending) {
    let refreshes = 0;
    let cleanup;
    let tick;
    const listeners = new Map();
    const document = {
        visibilityState: "visible",
        addEventListener: (name, fn) => listeners.set(name, fn),
        removeEventListener: (name) => listeners.delete(name),
    };
    const window = {
        addEventListener: document.addEventListener,
        removeEventListener: document.removeEventListener,
        setInterval: (fn, delay) => {
            expect(delay).toBe(30000);
            tick = fn;
            return 1;
        },
        clearInterval: () => {
            tick = undefined;
        },
    };
    const modules = {
        react: {
            useState: (value) => [
                typeof value === "function" ? value() : value,
                () => {},
            ],
            useEffect: (fn) => {
                cleanup = fn();
            },
        },
        "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
        "next/navigation": {
            useRouter: () => ({ refresh: () => refreshes++ }),
        },
        "next-intl": {
            useLocale: () => "en",
            useTranslations: () => (key) => key,
        },
        "../absence-reasons": {
            ABSENCE_REASONS: [],
            parseAbsenceReason: () => ({ reason: "", details: "" }),
            formatAbsenceReason: () => "",
        },
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        document,
        window,
        require: (name) => modules[name] ?? {},
    });
    exports.default({
        groupId: "group",
        attendanceId: "absence",
        excuse: null,
        pending,
    });
    return {
        listeners,
        document,
        refreshes: () => refreshes,
        tick: () => tick?.(),
        cleanup: () => cleanup?.(),
    };
}

test("pending form refreshes on mount, return and visible interval, with cleanup", () => {
    const form = mount(true);
    expect(form.refreshes()).toBe(1);
    form.listeners.get("focus")();
    form.tick();
    expect(form.refreshes()).toBe(3);
    form.document.visibilityState = "hidden";
    form.tick();
    expect(form.refreshes()).toBe(3);
    form.document.visibilityState = "visible";
    form.listeners.get("visibilitychange")();
    expect(form.refreshes()).toBe(4);
    form.cleanup();
    expect(form.listeners.size).toBe(0);
    form.tick();
    expect(form.refreshes()).toBe(4);
});

test("final decisions do not keep polling", () => {
    const form = mount(false);
    expect(form.refreshes()).toBe(0);
    expect(form.listeners.size).toBe(0);
});
