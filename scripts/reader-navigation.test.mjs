import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
    new URL(
        "../src/features/quran/components/quran-page-navigation.tsx",
        import.meta.url,
    ),
    "utf8",
);
const handler = source.slice(
    source.indexOf("function handleKeyDown"),
    source.indexOf('window.addEventListener("keydown"'),
);
const compiled = ts.transpileModule(handler, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

function press({
    interactive = false,
    overlay = false,
    hiddenOverlay = false,
    prevented = false,
    navigating = false,
    currentNumber = 2,
    key = "ArrowLeft",
} = {}) {
    const routes = [];
    class Element {
        closest() {
            return interactive;
        }
    }
    const context = {
        HTMLElement: Element,
        document: {
            querySelectorAll: () =>
                overlay || hiddenOverlay
                    ? [{ getClientRects: () => (overlay ? [{}] : []) }]
                    : [],
        },
        isNavigatingRef: { current: navigating },
        setIsNavigating() {},
        router: { push: (route) => routes.push(route) },
        currentNumber,
        min: 1,
        max: 604,
        readingMode: "page",
    };
    vm.createContext(context);
    vm.runInContext(compiled, context);
    context.handleKeyDown({
        key,
        defaultPrevented: prevented,
        target: new Element(),
        preventDefault() {},
    });
    return routes;
}

test("reader arrows navigate normally and respect boundaries", () => {
    assert.deepEqual(press(), ["/quran/page/3"]);
    assert.deepEqual(press({ key: "ArrowRight" }), ["/quran/page/1"]);
    assert.deepEqual(press({ currentNumber: 1, key: "ArrowRight" }), []);
    assert.deepEqual(press({ currentNumber: 604 }), []);
});

test("reader arrows leave controls, overlays, and handled events alone", () => {
    for (const options of [
        { interactive: true },
        { overlay: true },
        { prevented: true },
        { navigating: true },
    ]) {
        assert.deepEqual(press(options), []);
    }
    assert.deepEqual(press({ hiddenOverlay: true }), ["/quran/page/3"]);
});
