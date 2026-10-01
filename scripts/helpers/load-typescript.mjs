import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Isolate imports instead of globally mocking modules used by other test files.
export function loadTypeScript(path, modules, globals = {}) {
    const exports = {};
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
        },
    }).outputText;
    vm.runInNewContext(compiled, {
        exports,
        Date,
        URL,
        URLSearchParams,
        Request,
        Response,
        Headers,
        AbortSignal,
        crypto,
        ...globals,
        require(name) {
            if (!(name in modules))
                throw new Error(`Unexpected import: ${name}`);
            return modules[name];
        },
    });
    return exports;
}
