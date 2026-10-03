import { DateTime } from "luxon";
import * as reconcile from "../../src/features/learning/reconcile";
import * as schedule from "../../src/features/learning/schedule";
import * as capacity from "../../src/features/learning/weekly-capacity";
import * as progress from "../../src/features/memorization/progress";
import { loadTypeScript } from "./load-typescript.mjs";

export function loadMemorizationReconciliation(modules, getCatalogue) {
    return loadTypeScript("src/features/learning/server/reconcile-plan.ts", {
        ...modules,
        luxon: { DateTime },
        "@/features/memorization/progress": progress,
        "@/features/memorization/server/get-memory-catalogue": getCatalogue,
        "../reconcile": reconcile,
        "../schedule": schedule,
        "../weekly-capacity": capacity,
    });
}
