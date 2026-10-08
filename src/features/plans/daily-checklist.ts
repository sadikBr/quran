import { DateTime } from "luxon";
import { z } from "zod";
import type { PlanningTask } from "@/features/planning/planner";

export const DAILY_ADHKAR = ["morning", "evening", "sleep"] as const;
export type DailyAdhkarCategory = (typeof DAILY_ADHKAR)[number];
export const CHECKLIST_CHOICES = [
    "wird",
    "memorization",
    "revision",
    "practice",
    "circle",
    "recurring",
    "adhkar.morning",
    "adhkar.evening",
    "adhkar.sleep",
] as const;
export type ChecklistChoice = (typeof CHECKLIST_CHOICES)[number];
export const checklistSettingsSchema = z.object({
    visible: z
        .array(z.enum(CHECKLIST_CHOICES))
        .max(CHECKLIST_CHOICES.length)
        .transform((values) =>
            CHECKLIST_CHOICES.filter((key) => values.includes(key)),
        ),
    revision: z.number().int().min(0),
    resetAt: z.string().max(100).nullable(),
});
export type ChecklistSettings = z.infer<typeof checklistSettingsSchema>;
export const adhkarCompletionSchema = z.object({
    category: z.enum(DAILY_ADHKAR),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: z.string().min(1).max(100),
    revision: z.number().int().min(0),
    completed: z.boolean(),
    resetAt: z.string().max(100).nullable(),
});
export type DailyAdhkarCompletion = z.infer<typeof adhkarCompletionSchema>;
export type TodayTask = Omit<PlanningTask, "kind"> & {
    kind: PlanningTask["kind"] | "adhkar";
    adhkar?: DailyAdhkarCompletion;
    submitted?: boolean;
};
export type DailyChecklistState = {
    settings: ChecklistSettings;
    adhkar: DailyAdhkarCompletion[];
    date: string;
    timezone: string;
};
export type WeeklyAdhkarState = {
    today: string;
    timezone: string;
    days: { date: string; items: DailyAdhkarCompletion[] }[];
};
export type TodayChecklistCard =
    | { type: "task"; id: string; done: boolean; task: TodayTask }
    | {
          type: "adhkar";
          id: "adhkar";
          done: boolean;
          items: DailyAdhkarCompletion[];
      };

/** Group before limiting the Dashboard preview, so a collection never loses a row. */
export function groupTodayChecklist(tasks: TodayTask[]): TodayChecklistCard[] {
    const cards: TodayChecklistCard[] = tasks
        .filter((task) => !task.adhkar)
        .map((task) => ({
            type: "task",
            id: task.id,
            done: task.done,
            task,
        }));
    const items = DAILY_ADHKAR.flatMap((category) => {
        const task = tasks.find((task) => task.adhkar?.category === category);
        return task?.adhkar ? [task.adhkar] : [];
    });
    if (items.length)
        cards.push({
            type: "adhkar",
            id: "adhkar",
            done: items.every((item) => item.completed),
            items,
        });
    const isWird = (card: TodayChecklistCard) =>
        card.type === "task" && card.task.kind === "wird";
    return cards.sort(
        (a, b) =>
            Number(isWird(b)) - Number(isWird(a)) ||
            Number(a.done) - Number(b.done),
    );
}

export function checklistChoice(task: TodayTask): ChecklistChoice {
    return task.adhkar
        ? `adhkar.${task.adhkar.category}`
        : (task.kind as ChecklistChoice);
}

export function visibleTodayTasks(
    tasks: TodayTask[],
    settings: ChecklistSettings,
) {
    return tasks
        .filter((task) => settings.visible.includes(checklistChoice(task)))
        .sort((a, b) => {
            if (a.kind === "wird" || b.kind === "wird")
                return Number(b.kind === "wird") - Number(a.kind === "wird");
            return Number(a.done) - Number(b.done);
        });
}

export function localChecklistDate(timezone: string, now = new Date()) {
    return DateTime.fromJSDate(now, { zone: timezone }).toISODate() as string;
}
