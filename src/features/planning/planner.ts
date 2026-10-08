import { DateTime } from "luxon";
import { z } from "zod";

export type PlanningKind =
    | "memorization"
    | "revision"
    | "practice"
    | "circle"
    | "wird"
    | "recurring";
export type PlanningRange = {
    startSurahNumber: number;
    startAyahNumber: number;
    endSurahNumber: number;
    endAyahNumber: number;
};
export type PlanningTask = {
    id: string;
    kind: PlanningKind;
    title?: string;
    notes?: string;
    resourceHref?: string | null;
    skipped?: boolean;
    recurring?: {
        planId: string;
        revision: number;
        date: string;
        status: "pending" | "completed" | "skipped";
        actionable: boolean;
    };
    ranges: PlanningRange[];
    date: string | null;
    minutes: number;
    done: boolean;
    movable: boolean;
    estimateEditable?: boolean;
    wirdProjected?: boolean;
    minDate: string;
    maxDate: string;
    timezone: string;
    deadline: string | null;
    groupName: string | null;
    sequence: number | null;
    sessionIds: string[];
    href: string | null;
};
export type PlanningView = {
    weekStart: string;
    today: string;
    timezone: string;
    version: string;
    capacities: number[];
    tasks: PlanningTask[];
};

const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((date) => {
        const parsed = DateTime.fromISO(date, { zone: "UTC" });
        return parsed.isValid && parsed.toISODate() === date;
    });
export const planningDraftSchema = z.object({
    weekStart: dateSchema.refine(
        (date) => DateTime.fromISO(date).weekday === 1,
    ),
    version: z.string().regex(/^[a-f0-9]{64}$/),
    capacities: z.array(z.number().int().min(0).max(480)).length(7),
    tasks: z
        .array(
            z
                .object({
                    id: z.string().min(1).max(200),
                    date: dateSchema.nullable(),
                    minutes: z.union([
                        z.literal(0),
                        z.number().int().min(5).max(480),
                    ]),
                })
                .refine(
                    (task) =>
                        task.minutes >= 5 || task.id.startsWith("recurring:"),
                ),
        )
        .max(500),
});
export type PlanningDraft = z.infer<typeof planningDraftSchema>;
export type TaskPlacement = PlanningDraft["tasks"][number];

export function weekDates(weekStart: string) {
    const start = DateTime.fromISO(weekStart, { zone: "UTC" });
    return Array.from(
        { length: 7 },
        (_, index) => start.plus({ days: index }).toISODate() as string,
    );
}

export function initialDraft(view: PlanningView): PlanningDraft {
    return {
        weekStart: view.weekStart,
        version: view.version,
        capacities: [...view.capacities],
        tasks: view.tasks.map(({ id, date, minutes }) => ({
            id,
            date,
            minutes,
        })),
    };
}

export function dailyLoads(draft: PlanningDraft) {
    return weekDates(draft.weekStart).map((date, index) => {
        const tasks = draft.tasks.filter((task) => task.date === date);
        const minutes = tasks.reduce((total, task) => total + task.minutes, 0);
        const capacity = draft.capacities[index];
        return {
            date,
            minutes,
            capacity,
            count: tasks.length,
            over: Math.max(0, minutes - capacity),
        };
    });
}

/** Validate the complete draft against current, server-owned task constraints. */
export function validatePlacements(view: PlanningView, draft: PlanningDraft) {
    if (draft.version !== view.version || draft.weekStart !== view.weekStart)
        return "stale" as const;
    const byId = new Map(draft.tasks.map((task) => [task.id, task]));
    if (byId.size !== draft.tasks.length || byId.size !== view.tasks.length)
        return "invalid" as const;
    const dates = weekDates(view.weekStart);
    for (const task of view.tasks) {
        const proposed = byId.get(task.id);
        if (!proposed) return "invalid" as const;
        if (proposed.minutes < 5 && !task.skipped) return "invalid" as const;
        if (!task.movable && proposed.date !== task.date)
            return "locked" as const;
        if (
            !task.movable &&
            !task.estimateEditable &&
            proposed.minutes !== task.minutes
        )
            return "locked" as const;
        if (proposed.date === task.date) continue;
        if (proposed.date === null) {
            if (task.sequence !== null) return "order" as const;
            if (task.kind === "circle" && task.deadline) return "date" as const;
        } else if (
            !dates.includes(proposed.date) ||
            proposed.date < task.minDate ||
            proposed.date > task.maxDate
        ) {
            return "date" as const;
        }
    }
    for (const kind of ["memorization", "revision"] as const) {
        const queue = view.tasks
            .filter(
                (task) =>
                    task.kind === kind && task.sequence !== null && !task.done,
            )
            .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        let previous: string | null = null;
        for (const task of queue) {
            const date = byId.get(task.id)?.date;
            if (!date || (previous && date <= previous))
                return "order" as const;
            previous = date;
        }
    }
    return null;
}

/** Balance the existing work; ordered plan portions remain intact and within their week. */
export function balanceWeek(
    view: PlanningView,
    draft: PlanningDraft,
): PlanningDraft {
    const result = {
        ...draft,
        tasks: draft.tasks.map((task) => ({ ...task })),
    };
    const byId = new Map(result.tasks.map((task) => [task.id, task]));
    const dates = weekDates(draft.weekStart);
    const loads = Array<number>(7).fill(0);
    for (const task of view.tasks.filter((task) => !task.movable)) {
        const placed = byId.get(task.id);
        const index = dates.indexOf(placed?.date ?? "");
        if (index >= 0) loads[index] += placed?.minutes ?? 0;
    }
    const score = (totals: number[]) =>
        totals.reduce((total, minutes, index) => {
            const capacity = draft.capacities[index];
            return (
                total +
                Math.max(0, minutes - capacity) ** 2 * 100 +
                minutes ** 2 / Math.max(1, capacity)
            );
        }, 0);
    for (const kind of ["memorization", "revision"] as const) {
        const tasks = view.tasks
            .filter((task) => task.kind === kind && task.movable)
            .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        let best: number[] | null = null;
        let bestScore = Number.POSITIVE_INFINITY;
        const search = (index: number, slots: number[], totals: number[]) => {
            if (index === tasks.length) {
                const value = score(totals);
                if (value < bestScore) {
                    best = slots;
                    bestScore = value;
                }
                return;
            }
            const task = tasks[index];
            for (let slot = (slots.at(-1) ?? -1) + 1; slot < 7; slot++) {
                if (
                    !draft.capacities[slot] ||
                    dates[slot] < task.minDate ||
                    dates[slot] > task.maxDate
                )
                    continue;
                const fixed = view.tasks.filter(
                    (other) =>
                        other.kind === kind &&
                        !other.movable &&
                        !other.done &&
                        other.sequence !== null,
                );
                if (
                    fixed.some((other) =>
                        (other.sequence ?? 0) < (task.sequence ?? 0)
                            ? (other.date ?? "") >= dates[slot]
                            : (other.date ?? "") <= dates[slot],
                    )
                )
                    continue;
                const next = [...totals];
                next[slot] += byId.get(task.id)?.minutes ?? task.minutes;
                search(index + 1, [...slots, slot], next);
            }
        };
        search(0, [], loads);
        tasks.forEach((task, index) => {
            const placed = byId.get(task.id);
            if (!placed) return;
            if (best) placed.date = dates[best[index]];
            const slot = dates.indexOf(placed.date ?? "");
            if (slot >= 0) loads[slot] += placed.minutes;
        });
    }
    const flexible = view.tasks
        .filter((task) => task.movable && task.sequence === null)
        .sort(
            (a, b) =>
                a.maxDate.localeCompare(b.maxDate) ||
                (byId.get(b.id)?.minutes ?? 0) - (byId.get(a.id)?.minutes ?? 0),
        );
    for (const task of flexible) {
        const placed = byId.get(task.id);
        if (!placed) continue;
        const choices = dates
            .map((date, index) => ({ date, index }))
            .filter(
                ({ date, index }) =>
                    draft.capacities[index] > 0 &&
                    date >= task.minDate &&
                    date <= task.maxDate,
            )
            .sort((a, b) => {
                const aLoads = [...loads],
                    bLoads = [...loads];
                aLoads[a.index] += placed.minutes;
                bLoads[b.index] += placed.minutes;
                return score(aLoads) - score(bLoads) || a.index - b.index;
            });
        if (choices[0]) placed.date = choices[0].date;
        const slot = dates.indexOf(placed.date ?? "");
        if (slot >= 0) loads[slot] += placed.minutes;
    }
    return validatePlacements(view, result) ? draft : result;
}
