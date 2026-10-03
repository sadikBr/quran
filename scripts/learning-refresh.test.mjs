import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";

// Keep hook state across simulated server refreshes, including effect dependencies.
function mount(path, initialProps, imports = {}) {
    const hooks = [];
    let cursor = 0;
    let effects = [];
    let dirty = false;
    let props = initialProps;
    const router = { refresh() {} };
    const react = {
        useState(initial) {
            const i = cursor++;
            if (!(i in hooks))
                hooks[i] = typeof initial === "function" ? initial() : initial;
            return [
                hooks[i],
                (next) => {
                    const value =
                        typeof next === "function" ? next(hooks[i]) : next;
                    if (!Object.is(hooks[i], value)) dirty = true;
                    hooks[i] = value;
                },
            ];
        },
        useRef(initial) {
            const i = cursor++;
            hooks[i] ??= { current: initial };
            return hooks[i];
        },
        useEffect(effect, deps) {
            const i = cursor++;
            if (
                !hooks[i] ||
                deps.some((value, j) => !Object.is(value, hooks[i][j]))
            ) {
                hooks[i] = deps;
                effects.push(effect);
            }
        },
        useTransition: () => [false, (callback) => callback()],
    };
    const modules = {
        react,
        "react/jsx-runtime": jsx,
        "lucide-react": new Proxy({}, { get: (_, key) => String(key) }),
        "next/link": "Link",
        "next/navigation": { useRouter: () => router },
        "next-intl": {
            useLocale: () => "en",
            useTranslations: () => (key) => key,
        },
        sonner: { toast: { success() {}, error() {} } },
        "@/components/ui/button": { Button: "Button" },
        "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
        ...imports,
    };
    function load(sourcePath) {
        const exports = {};
        const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                jsx: ts.JsxEmit.ReactJSX,
                esModuleInterop: true,
            },
        }).outputText;
        vm.runInNewContext(compiled, {
            exports,
            setInterval() {},
            clearInterval() {},
            document: { addEventListener() {}, removeEventListener() {} },
            require(name) {
                if (name in modules) return modules[name];
                if (name.endsWith("use-plan-editor"))
                    return load(
                        "src/features/learning/components/use-plan-editor.ts",
                    );
                if (name.endsWith("weekly-plan-ui"))
                    return {
                        PlanOverview: "Overview",
                        PlanPreview: "Preview",
                        PlanSessions: "Sessions",
                        PlanSetupNotice: "Setup",
                        usePlanFormatting: () => ({
                            range: (item) =>
                                `${item.startSurahNumber}:${item.startAyahNumber}`,
                        }),
                    };
                throw new Error(`Unexpected import: ${name}`);
            },
        });
        return exports;
    }
    const exports = load(path);
    return (nextProps = props) => {
        props = nextProps;
        let tree;
        let renders = 0;
        do {
            if (++renders > 20) throw new Error("Render loop");
            cursor = 0;
            dirty = false;
            effects = [];
            tree = exports.default(props);
            for (const effect of effects) effect();
        } while (dirty);
        function flatten(node) {
            if (!node || typeof node !== "object") return [];
            return [
                node,
                ...[node.props?.children].flat(Infinity).flatMap(flatten),
            ];
        }
        return flatten(tree);
    };
}

test("study day drafts survive unchanged server refreshes and update after a saved revision", () => {
    const schedule = { revisionDays: [1], memorizationDays: [3], revision: 1 };
    const render = mount(
        "src/features/learning/components/study-schedule.tsx",
        { schedule },
        {
            "../server/actions": {},
        },
    );
    const inputs = (nodes) => nodes.filter((node) => node.type === "input");
    inputs(render())[1].props.onChange();
    expect(inputs(render())[1].props.checked).toBe(true);
    const refreshed = render({ schedule: structuredClone(schedule) });
    expect(inputs(refreshed)[1].props.checked).toBe(true);
    const saved = render({
        schedule: { ...schedule, revisionDays: [5], revision: 2 },
    });
    expect(inputs(saved)[1].props.checked).toBe(false);
    expect(inputs(saved)[4].props.checked).toBe(true);
});

test("revision previews survive unchanged refreshes and are invalidated when saved days change", async () => {
    const props = {
        view: { plan: null, setup: true, completedHizbs: 1, sessions: [] },
        revisionDays: [1, 3],
        defaultTimezone: "UTC",
        defaultRiwayah: "hafs",
        surahs: [],
    };
    const preview = {
        ready: true,
        key: "preview",
        sessions: [],
        nextWeek: false,
        weekStart: "2026-09-28",
    };
    const render = mount(
        "src/features/revision/components/weekly-revision.tsx",
        props,
        {
            "./revision-plan-settings": "Settings",
            "../server/actions": {
                previewWeeklyRevision: async () => ({ success: true, preview }),
            },
        },
    );
    const settings = (nodes) => nodes.find((node) => node.type === "Settings");
    await settings(render()).props.onPreview();
    const hasPreview = (nodes) => nodes.some((node) => node.type === "Preview");
    expect(hasPreview(render())).toBe(true);
    expect(hasPreview(render({ ...props, revisionDays: [1, 3] }))).toBe(true);
    const changed = render({ ...props, revisionDays: [2, 4] });
    expect(hasPreview(changed)).toBe(false);
    expect(settings(changed).props.settings.days).toEqual([2, 4]);
});

for (const kind of ["revision", "memorization"]) {
    const isRevision = kind === "revision";
    const path = isRevision
        ? "src/features/revision/components/weekly-revision.tsx"
        : "src/features/learning/components/weekly-memorization.tsx";
    const createProps = () => ({
        view: {
            plan: {
                enabled: true,
                revision: 1,
                days: [1, 3],
                quartersPerDay: 2,
                quartersPerWeek: 2,
                startQuarter: 1,
                direction: "forward",
                timezone: "UTC",
                riwayah: "hafs",
                reminderTime: null,
            },
            week: null,
            today: "2026-10-02",
            setup: true,
            completedHizbs: 1,
            sessions: [],
            quarterStarts: { hafs: [], warsh: [] },
            firstUnmemorizedQuarter: 1,
        },
        revisionDays: [1, 3],
        memorizationDays: [1, 3],
        defaultTimezone: "UTC",
        defaultRiwayah: "hafs",
        surahs: [],
    });
    function mountPlan(props, actions = {}) {
        return mount(path, props, {
            [isRevision
                ? "./revision-plan-settings"
                : "./memorization-plan-settings"]: "Settings",
            "../server/actions": actions,
        });
    }
    const find = (nodes, type) => nodes.find((node) => node.type === type);
    test(`${kind}: cancel discards edits and reopening loads current saved settings`, () => {
        const props = createProps();
        const render = mountPlan(props);
        find(render(), "Overview").props.onEdit();
        find(render(), "Settings").props.onChange({ timezone: "Asia/Tokyo" });
        expect(find(render(), "Settings").props.settings.timezone).toBe(
            "Asia/Tokyo",
        );
        find(render(), "Settings").props.onCancel();
        expect(find(render(), "Settings")).toBeUndefined();
        find(render(), "Overview").props.onEdit();
        expect(find(render(), "Settings").props.settings.timezone).toBe("UTC");
        const updated = {
            ...props,
            view: {
                ...props.view,
                plan: {
                    ...props.view.plan,
                    revision: 2,
                    timezone: "Europe/Paris",
                },
            },
        };
        expect(find(render(updated), "Settings").props.settings.timezone).toBe(
            "Europe/Paris",
        );
    });
    test(`${kind}: pause closes the editor and both plans resume through preview`, async () => {
        const props = createProps();
        const actions = {
            [isRevision ? "pauseWeeklyRevision" : "pauseWeeklyMemorization"]:
                async () => ({ success: true }),
        };
        const render = mountPlan(props, actions);
        find(render(), "Overview").props.onEdit();
        await find(render(), "Overview").props.onPause();
        expect(find(render(), "Settings")).toBeUndefined();
        const paused = {
            ...props,
            view: {
                ...props.view,
                plan: { ...props.view.plan, enabled: false, revision: 2 },
            },
        };
        find(render(paused), "Overview").props.onEdit();
        expect(find(render(), "Settings")).toBeDefined();
    });
    test(`${kind}: previews survive refreshes, invalidate on changed days, and avoid duplicate requests`, async () => {
        const props = createProps();
        let resolve;
        let calls = 0;
        const request = new Promise((done) => {
            resolve = done;
        });
        const render = mountPlan(props, {
            [isRevision
                ? "previewWeeklyRevision"
                : "previewWeeklyMemorization"]: () => {
                calls++;
                return request;
            },
        });
        find(render(), "Overview").props.onEdit();
        const onPreview = find(render(), "Settings").props.onPreview;
        const first = onPreview();
        await onPreview();
        expect(calls).toBe(1);
        resolve({
            success: true,
            preview: {
                ready: true,
                sessions: [],
                weekStart: "2026-10-05",
                nextWeek: true,
            },
        });
        await first;
        expect(find(render(), "Preview")).toBeDefined();
        expect(find(render(structuredClone(props)), "Preview")).toBeDefined();
        const changed = { ...props, revisionDays: [2], memorizationDays: [2] };
        expect(find(render(changed), "Preview")).toBeUndefined();
    });
    test(`${kind}: regeneration previews the new schedule and saves only on confirmation`, async () => {
        const props = createProps();
        const calls = [];
        const render = mountPlan(props, {
            [isRevision
                ? "previewWeeklyRevision"
                : "previewWeeklyMemorization"]: async (
                _settings,
                regenerate,
            ) => {
                calls.push(["preview", regenerate]);
                return {
                    success: true,
                    preview: {
                        key: "k".repeat(64),
                        ready: true,
                        regenerate,
                        sessions: [],
                    },
                };
            },
            [isRevision ? "saveWeeklyRevision" : "saveWeeklyMemorization"]:
                async (input) => {
                    calls.push(["save", input]);
                    return { success: true };
                },
        });
        find(render(), "Overview").props.onRegenerate();
        expect(find(render(), "Settings").props.regenerating).toBe(true);
        await find(render(), "Settings").props.onPreview();
        expect(calls).toEqual([["preview", true]]);
        expect(find(render(), "Preview").props.preview.regenerate).toBe(true);
        await find(render(), "Preview").props.onSave();
        expect(calls[1][1].regenerate).toBe(true);
        expect(calls[1][1].confirmed).toBe(true);
        expect(find(render(), "Settings")).toBeUndefined();
        find(render(), "Overview").props.onEdit();
        expect(find(render(), "Settings").props.regenerating).toBe(false);
        find(render(), "Overview").props.onRegenerate();
        find(render(), "Settings").props.onCancel();
        expect(find(render(), "Preview")).toBeUndefined();
    });
    test(`${kind}: deletion uses the confirmation's captured version and returns to plan creation`, async () => {
        const props = createProps();
        const calls = [];
        const render = mountPlan(props, {
            [isRevision ? "deleteWeeklyRevision" : "deleteWeeklyMemorization"]:
                async (input) => {
                    calls.push(input);
                    return { success: true };
                },
        });
        const captured = "a".repeat(64);
        expect(await find(render(), "Overview").props.onDelete(captured)).toBe(
            true,
        );
        expect(calls).toEqual([{ version: captured, confirmed: true }]);
        const removed = {
            ...props,
            view: { ...props.view, plan: null, week: null, sessions: [] },
        };
        expect(find(render(removed), "Settings")).toBeDefined();
        expect(find(render(), "Sessions")).toBeUndefined();
        expect(find(render(), "Settings").props.regenerating).toBe(false);
    });
    test(`${kind}: only today’s active plan cards link directly to the Practice reader`, () => {
        const props = createProps();
        props.view.sessions = [
            {
                id: "session",
                active: true,
                scheduledDate: "2026-10-02",
                done: false,
                available: true,
                quarters: [1],
                total: 10,
                completed: 0,
                peer: 0,
                startSurahNumber: 2,
                startAyahNumber: 1,
            },
        ];
        const render = mountPlan(props);
        expect(find(render(), "Sessions").props.items[0].href).toBe(
            `/practice/${kind}/session/read`,
        );
        expect(find(render(), "Sessions").props.items[0].action).toBe("open");
        const resumed = {
            ...props,
            view: {
                ...props.view,
                sessions: props.view.sessions.map((s) => ({
                    ...s,
                    progressSurahNumber: 2,
                    progressAyahNumber: 1,
                })),
            },
        };
        expect(find(render(resumed), "Sessions").props.items[0].action).toBe(
            "continue",
        );
        for (const change of [
            { active: false },
            { scheduledDate: "2026-10-05" },
            { done: true },
            ...(isRevision ? [{ available: false }] : []),
        ]) {
            const inactive = {
                ...props,
                view: {
                    ...props.view,
                    sessions: props.view.sessions.map((s) => ({
                        ...s,
                        ...change,
                    })),
                },
            };
            expect(
                find(render(inactive), "Sessions").props.items[0].href,
            ).toBeUndefined();
        }
        const paused = {
            ...props,
            view: {
                ...props.view,
                plan: { ...props.view.plan, enabled: false, revision: 2 },
            },
        };
        expect(
            find(render(paused), "Sessions").props.items[0].href,
        ).toBeUndefined();
        const unscheduled = {
            ...props,
            view: {
                ...props.view,
                sessions: props.view.sessions.map((s) => ({
                    ...s,
                    scheduledDate: null,
                })),
            },
        };
        const waiting = find(render(unscheduled), "Sessions").props.items[0];
        expect(waiting.href).toBeUndefined();
        expect(waiting.description).toBe("noStudyDays");
    });
}
