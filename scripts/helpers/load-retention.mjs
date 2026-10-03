import { DateTime } from "luxon";
import * as carry from "../../src/features/learning/carry-forward";
import * as progress from "../../src/features/memorization/progress";
import * as activity from "../../src/features/retention/activity";
import * as followUp from "../../src/features/retention/follow-up-plan";
import * as schedule from "../../src/features/revision/schedule";
import { loadTypeScript } from "./load-typescript.mjs";

export function loadRetention(modules) {
    const state = loadTypeScript("src/features/retention/server/state.ts", {
        ...modules,
        "@/features/memorization/progress": progress,
        "../activity": activity,
    });
    const plan = loadTypeScript(
        "src/features/retention/server/follow-up-plan.ts",
        {
            ...modules,
            luxon: { DateTime },
            "@/features/learning/carry-forward": carry,
            "@/features/revision/schedule": schedule,
            "../follow-up-plan": followUp,
            "./state": state,
        },
    );
    return {
        "@/features/retention/server/state": state,
        "@/features/retention/server/follow-up-plan": plan,
    };
}
