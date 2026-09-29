import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the component's actual handlers with a fake SDK: no live calls,
// credentials, database writes, or quota usage are needed.
const source = ts.transpileModule(
    readFileSync(
        new URL(
            "../src/features/groups/components/jaas-meeting.tsx",
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

function mount() {
    const effects = [];
    const calls = [];
    const events = new Map();
    const timers = new Map();
    const sdkEvents = new Map();
    let timerId = 0;
    let stateId = 0;
    const jsx = (type, props) => ({ type, props });
    const modules = {
        "react/jsx-runtime": { jsx, jsxs: jsx },
        react: {
            useState: (value) => [stateId++ === 0 ? true : value, () => {}],
            useRef: (value) => ({ current: value }),
            useCallback: (fn) => fn,
            useEffect: (fn) => effects.push(fn),
        },
        "next/dynamic": () => "Meeting",
        "next/navigation": {
            useRouter: () => ({
                replace: (url) => calls.push(["navigate", url]),
            }),
        },
        "next-intl": { useTranslations: () => (key) => key },
        "lucide-react": {
            LoaderCircle: "Loader",
            LogOut: "LogOut",
            Video: "Video",
        },
        "@/components/app-primary-nav": "Nav",
        "@/components/ui/button": { Button: "Button" },
        "./meeting-review-panel": "ReviewPanel",
    };
    const context = {
        exports: {},
        require: (name) => {
            assert.ok(name in modules, `Unexpected import: ${name}`);
            return modules[name];
        },
        setTimeout: (fn) => {
            timers.set(++timerId, fn);
            return timerId;
        },
        clearTimeout: (id) => timers.delete(id),
        fetch: (_url, options) => {
            calls.push([options.method]);
            return Promise.resolve();
        },
        window: {
            localStorage: { setItem() {} },
            setInterval: () => 1,
            clearInterval: () => calls.push(["stop-heartbeat"]),
            addEventListener: (name, fn) => events.set(name, fn),
            removeEventListener: (name) => events.delete(name),
            location: { reload: () => calls.push(["reload"]) },
        },
    };
    vm.runInNewContext(source, context);
    const tree = context.exports.default({
        groupId: "circle",
        appId: "test",
        roomName: "room",
        token: "test",
        locale: "en",
        displayName: "Test",
        email: "test@example.test",
    });
    const cleanups = effects.map((effect) => effect());
    function find(node, type) {
        if (!node || typeof node !== "object") return;
        if (node.type === type) return node.props;
        for (const child of [node.props?.children].flat()) {
            const found = find(child, type);
            if (found) return found;
        }
    }
    const meeting = find(tree, "Meeting");
    const api = {
        executeCommand: (command) => calls.push([command]),
        dispose: () => calls.push(["dispose"]),
        addEventListener: (name, fn) => sdkEvents.set(name, fn),
    };
    meeting.onApiReady(api);
    sdkEvents.get("videoConferenceJoined")();
    return {
        calls,
        events,
        timers,
        meeting,
        api,
        leave: find(tree, "Button").onClick,
        unmount: () => {
            for (const cleanup of cleanups) cleanup?.();
        },
    };
}

test("Leave hangs up before navigating and cleans up only once", () => {
    const room = mount();
    room.leave();
    room.leave();
    assert.equal(room.calls.filter(([name]) => name === "hangup").length, 1);
    assert.equal(
        room.calls.some(([name]) => name === "navigate"),
        false,
    );
    room.meeting.onReadyToClose();
    room.meeting.onReadyToClose();
    room.unmount();
    assert.deepEqual(room.calls.slice(-3), [
        ["stop-heartbeat"],
        ["DELETE"],
        ["navigate", "/groups/circle"],
    ]);
    assert.equal(room.calls.filter(([name]) => name === "dispose").length, 1);
    assert.equal(room.timers.size, 0);
});

test("Stalled hangup times out and disposes the iframe", () => {
    const room = mount();
    room.leave();
    for (const timer of room.timers.values()) timer();
    assert.ok(room.calls.some(([name]) => name === "dispose"));
    assert.equal(room.calls.at(-1)[0], "navigate");
});

test("Navigation away hangs up and disposes without redirecting", () => {
    const room = mount();
    room.unmount();
    room.meeting.onReadyToClose();
    assert.ok(room.calls.some(([name]) => name === "hangup"));
    assert.ok(room.calls.some(([name]) => name === "dispose"));
    assert.equal(
        room.calls.some(([name]) => name === "navigate"),
        false,
    );
});

test("Page hide disconnects and bfcache restoration reloads", () => {
    const room = mount();
    room.events.get("pagehide")();
    room.events.get("pageshow")({ persisted: true });
    assert.ok(room.calls.some(([name]) => name === "dispose"));
    assert.equal(room.calls.at(-1)[0], "reload");
});

test("Broken SDK hangup still allows leaving", () => {
    const room = mount();
    room.api.executeCommand = () => {
        throw new Error("Iframe gone");
    };
    room.leave();
    assert.equal(room.calls.at(-1)[0], "navigate");
    assert.equal(room.timers.size, 0);
});
