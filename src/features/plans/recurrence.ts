import { DateTime } from "luxon";
import { z } from "zod";
import type {
    recurringOccurrence,
    recurringPlan,
} from "@/drizzle/schema/recurring-plan";
import type { PlanningTask } from "@/features/planning/planner";

export const recurringSettingsSchema = z.object({
    title: z.string().trim().min(1).max(120),
    notes: z.string().trim().max(2000),
    days: z
        .array(z.number().int().min(1).max(7))
        .min(1)
        .max(7)
        .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
    timezone: z
        .string()
        .min(1)
        .max(100)
        .refine((zone) => DateTime.now().setZone(zone).isValid),
    minutes: z.number().int().min(5).max(480),
    reminderTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .nullable(),
    surahNumber: z.number().int().min(1).max(114).nullable(),
    resourceUrl: z
        .string()
        .url()
        .max(2000)
        .refine((url) => ["http:", "https:"].includes(new URL(url).protocol))
        .nullable(),
});
export type RecurringSettings = z.infer<typeof recurringSettingsSchema>;
export function recurringSettingsFromForm(form: FormData) {
    const text = (key: string) => String(form.get(key) ?? "");
    return recurringSettingsSchema.safeParse({
        title: text("title"),
        notes: text("notes"),
        days: form.getAll("days").map(Number),
        timezone: text("timezone"),
        minutes: Number(text("minutes")),
        reminderTime: text("reminderTime") || null,
        surahNumber: text("surahNumber") ? Number(text("surahNumber")) : null,
        resourceUrl: text("resourceUrl").trim() || null,
    });
}
export type RecurringPlan = typeof recurringPlan.$inferSelect;
export type RecurringOccurrence = typeof recurringOccurrence.$inferSelect;
export type RecurringState = {
    plans: RecurringPlan[];
    occurrences: RecurringOccurrence[];
};

export function recurringToday(
    plan: Pick<RecurringPlan, "timezone">,
    now = new Date(),
) {
    return DateTime.fromJSDate(now, {
        zone: plan.timezone,
    }).toISODate() as string;
}

export function occursOn(
    plan: Pick<
        RecurringPlan,
        "enabled" | "archived" | "days" | "startDate" | "timezone"
    >,
    date: string,
) {
    const day = DateTime.fromISO(date, { zone: plan.timezone });
    return (
        day.isValid &&
        day.toISODate() === date &&
        plan.enabled &&
        !plan.archived &&
        date >= plan.startDate &&
        plan.days.includes(day.weekday)
    );
}

export function recurringReminderDate(plan: RecurringPlan, now = new Date()) {
    const local = DateTime.fromJSDate(now, { zone: plan.timezone });
    const date = local.toISODate();
    if (!date || !plan.reminderTime || !occursOn(plan, date)) return null;
    const [hour, minute] = plan.reminderTime.split(":").map(Number);
    const scheduled = local.startOf("day").set({ hour, minute });
    const elapsed = local.diff(scheduled, "minutes").minutes;
    return elapsed >= 0 && elapsed < 30 ? date : null;
}

/** Forecasts are read-only; each local date has its own completion, without carry-forward. */
export function recurringPlanningTasks(
    state: RecurringState,
    dates: string[] | null,
    estimates: Record<string, number> = {},
    now = new Date(),
): PlanningTask[] {
    return state.plans.flatMap((plan) => {
        const today = recurringToday(plan, now);
        return (dates ?? [today]).flatMap((date) => {
            const saved = state.occurrences.find(
                (item) => item.planId === plan.id && item.localDate === date,
            );
            if (!saved && (date < today || !occursOn(plan, date))) return [];
            const source = saved?.snapshot ?? plan;
            const id = `recurring:${plan.id}:${date}`;
            return [
                {
                    id,
                    kind: "recurring" as const,
                    title: source.title,
                    notes: source.notes,
                    date,
                    minutes:
                        saved?.status === "skipped"
                            ? 0
                            : (estimates[id] ?? source.minutes),
                    done: Boolean(saved),
                    skipped: saved?.status === "skipped",
                    movable: false,
                    estimateEditable: !saved,
                    minDate: date,
                    maxDate: date,
                    timezone: source.timezone,
                    deadline: null,
                    groupName: null,
                    sequence: null,
                    sessionIds: [],
                    ranges: [],
                    resourceHref: source.surahNumber
                        ? source.resourceUrl
                        : null,
                    href: source.surahNumber
                        ? `/quran/surah/${source.surahNumber}`
                        : source.resourceUrl,
                    recurring: {
                        planId: plan.id,
                        revision: plan.revision,
                        date,
                        status: saved?.status ?? "pending",
                        actionable:
                            date === today &&
                            (Boolean(saved) || occursOn(plan, date)),
                    },
                },
            ];
        });
    });
}
