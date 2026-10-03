import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
    readFileSync(
        new URL(
            "../src/features/groups/components/review-decision-form.tsx",
            import.meta.url,
        ),
        "utf8",
    ),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
        },
    },
).outputText;

async function mount(
    action,
    overrides = {},
    availability = { next: "2026-10-10T12:00:00Z", timezone: "UTC" },
) {
    const effects = [];
    const states = [];
    const refs = [];
    const calls = [];
    let stateIndex = 0;
    let refIndex = 0;
    const jsx = (type, props) => ({ type, props });
    const modules = {
        "react/jsx-runtime": { jsx, jsxs: jsx },
        react: {
            useEffect: (effect) => {
                if (!effects.length) effects.push(effect);
            },
            useCallback: (callback) => callback,
            useState: (initial) => {
                const index = stateIndex++;
                if (!(index in states)) states[index] = initial;
                return [
                    states[index],
                    (value) => {
                        states[index] = value;
                    },
                ];
            },
            useRef: (initial) => {
                const index = refIndex++;
                refs[index] ??= { current: initial };
                return refs[index];
            },
        },
        "next/navigation": {
            useRouter: () => ({
                replace: (url) => calls.push(["navigate", url]),
                refresh: () => calls.push(["refresh"]),
            }),
        },
        "next-intl": {
            useTranslations: () => (key) => key,
            useLocale: () => "en",
        },
        "../server/get-revision-availability": async () => availability,
        "../server/meeting-schedule": {
            getMeetingDisplayTimezone: (zone) => zone,
        },
        "lucide-react": {
            CheckCircle2: "Check",
            LoaderCircle: "Loader",
            RotateCcw: "Revision",
        },
        sonner: {
            toast: {
                success: (text) => calls.push(["success", text]),
                error: (text) => calls.push(["error", text]),
            },
        },
        "@/components/ui/button": { Button: "Button" },
        "@/components/ui/label": { Label: "Label" },
        "@/components/ui/textarea": { Textarea: "Textarea" },
        "@/features/retention/components/mistake-editor": () => null,
        "../server/review-member-assignment": async (input) => {
            calls.push(["save", input]);
            return action(input);
        },
    };
    const context = {
        exports: {},
        window: { addEventListener: () => {}, removeEventListener: () => {} },
        require: (name) => {
            assert.ok(name in modules);
            return modules[name];
        },
    };
    vm.runInNewContext(source, context);
    const render = () => {
        stateIndex = 0;
        refIndex = 0;
        const nodes = [];
        function visit(node) {
            if (!node || typeof node !== "object") return;
            nodes.push(node);
            for (const child of [node.props?.children].flat(Infinity))
                visit(child);
        }
        visit(
            context.exports.default({
                groupId: "circle",
                assignmentId: "one",
                occurrence: "2026-10-10T12:00:00.000Z",
                pendingCount: 2,
                ...overrides,
            }),
        );
        return {
            buttons: nodes
                .filter((node) => node.type === "Button")
                .map((node) => node.props),
            note: nodes.find((node) => node.type === "Textarea").props,
            choices: nodes
                .filter((node) => node.type === "input")
                .map((node) => node.props),
        };
    };
    render();
    effects[0]();
    await new Promise((resolve) => setImmediate(resolve));
    return { render, calls };
}

test("unsubmitted work only offers not completed", async () => {
    const form = await mount(
        () => ({ success: true, nextAssignmentId: null }),
        {
            submitted: false,
        },
    );
    assert.deepEqual(
        form.render().choices.map((choice) => choice.value),
        ["not_completed"],
    );
    await form.render().buttons[1].onClick();
    assert.equal(
        form.calls.find(([name]) => name === "save")[1].decision,
        "not_completed",
    );
});

test("submitted work can be marked not completed", async () => {
    const form = await mount(() => ({ success: true, nextAssignmentId: null }));
    form.render()
        .choices.find((choice) => choice.value === "not_completed")
        .onChange();
    await form.render().buttons[1].onClick();
    assert.equal(
        form.calls.find(([name]) => name === "save")[1].decision,
        "not_completed",
    );
    assert.ok(
        form.calls.some(
            ([name, message]) =>
                name === "success" && message === "notCompletedSuccess",
        ),
    );
});

test("Save and next advances to the fresh server-selected assignment", async () => {
    const form = await mount(() => ({
        success: true,
        nextAssignmentId: "two",
    }));
    form.render().note.onChange({ target: { value: "Review this verse" } });
    form.render().choices[1].onChange();
    await form.render().buttons[0].onClick();
    const input = form.calls.find(([name]) => name === "save")[1];
    assert.equal(input.note, "Review this verse");
    assert.equal(input.decision, "needs_revision");
    assert.equal(input.occurrence, "2026-10-10T12:00:00.000Z");
    assert.equal(input.reviewNext, true);
    assert.ok(
        form.calls.some(
            ([name, url]) =>
                name === "navigate" && url === "/groups/circle/review/two",
        ),
    );
    assert.equal(form.render().buttons[0].disabled, true);
});

test("Last review finishes the queue; save and return does not continue it", async () => {
    for (const button of [0, 1]) {
        const form = await mount(() => ({
            success: true,
            nextAssignmentId: null,
        }));
        await form.render().buttons[button].onClick();
        assert.ok(
            form.calls.some(
                ([name, url]) =>
                    name === "navigate" &&
                    url === "/assignments?view=manage&group=circle",
            ),
        );
        assert.equal(
            form.calls.some(
                ([name, text]) =>
                    name === "success" && text === "queueComplete",
            ),
            button === 0,
        );
    }
});

test("Failed saves preserve feedback, enable retry, and never navigate", async () => {
    for (const action of [
        () => ({ success: false, reason: "not_submitted" }),
        () => {
            throw new Error("offline");
        },
    ]) {
        const form = await mount(action);
        form.render().note.onChange({
            target: { value: "Keep this feedback" },
        });
        await form.render().buttons[0].onClick();
        assert.equal(form.render().note.value, "Keep this feedback");
        assert.equal(form.render().buttons[0].disabled, false);
        assert.equal(
            form.calls.some(([name]) => name === "navigate"),
            false,
        );
    }
});

test("Rapid repeated saves submit only one review", async () => {
    let resolve;
    const form = await mount(
        () =>
            new Promise((done) => {
                resolve = done;
            }),
    );
    const first = form.render().buttons[0].onClick();
    await form.render().buttons[0].onClick();
    assert.equal(form.calls.filter(([name]) => name === "save").length, 1);
    resolve({ success: true, nextAssignmentId: "two" });
    await first;
});

test("Embedded review saves and advances without navigating or refreshing the call", async () => {
    const next = [];
    const form = await mount(
        () => ({ success: true, nextAssignmentId: "two" }),
        {
            onSaved: async (id) => {
                next.push(id);
            },
        },
    );
    await form.render().buttons[0].onClick();
    assert.deepEqual(next, ["two"]);
    assert.equal(
        form.calls.some(([name]) => name === "navigate" || name === "refresh"),
        false,
    );
});

test("Stale embedded review refreshes only the panel", async () => {
    let refreshed = false;
    const form = await mount(
        () => ({ success: false, reason: "not_submitted" }),
        {
            onStale: () => {
                refreshed = true;
            },
        },
    );
    await form.render().buttons[0].onClick();
    assert.equal(refreshed, true);
    assert.equal(
        form.calls.some(([name]) => name === "navigate" || name === "refresh"),
        false,
    );
});

test("missing next meeting blocks revision but preserves the feedback and allows approval", async () => {
    const form = await mount(
        () => ({ success: true }),
        {},
        { next: null, timezone: "UTC" },
    );
    form.render().note.onChange({
        target: { value: "Keep this note while scheduling" },
    });
    form.render()
        .choices.find((choice) => choice.value === "needs_revision")
        .onChange();
    const buttons = form.render().buttons;
    const save = buttons.find((button) => button.children === "saveAndReturn");
    assert.equal(save.disabled, true);
    await save.onClick();
    assert.equal(
        form.calls.some(([name]) => name === "save"),
        false,
    );
    assert.equal(form.render().note.value, "Keep this note while scheduling");
    form.render()
        .choices.find((choice) => choice.value === "completed")
        .onChange();
    assert.equal(form.render().buttons[0].disabled, false);
});
