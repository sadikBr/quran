import * as progress from "../../src/features/memorization/progress";
import * as reconcile from "../../src/features/revision/reconcile";
import { loadTypeScript } from "./load-typescript.mjs";

export function loadRevisionReconciliation(modules, getCatalogue) {
    return loadTypeScript("src/features/revision/server/reconcile-plan.ts", {
        ...modules,
        "@/features/memorization/progress": progress,
        "@/features/memorization/server/get-memory-catalogue": getCatalogue,
        "../reconcile": reconcile,
    });
}
