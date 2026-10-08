import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    dailyAdhkarCompletion,
    dailyChecklistSettings,
    user,
    userSettings,
} from "@/drizzle/schema";
import { weekDates } from "@/features/planning/planner";
import { DEFAULT_PREFERENCES } from "@/features/settings/preferences";
import {
    CHECKLIST_CHOICES,
    type ChecklistSettings,
    DAILY_ADHKAR,
    type DailyAdhkarCompletion,
    type DailyChecklistState,
    localChecklistDate,
    type WeeklyAdhkarState,
} from "../daily-checklist";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const stale = { success: false as const, reason: "stale" as const };

async function lockOwner(
    tx: Transaction,
    userId: string,
    resetAt: string | null,
) {
    const [account] = await tx
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .for("update");
    return (
        account &&
        account.role !== "admin" &&
        !account.suspendedAt &&
        (account.dataResetAt?.toISOString() ?? null) === resetAt
    );
}

async function readChecklistRange(userId: string, from: string, to: string) {
    const [[settings], completions, [account]] = await Promise.all([
        db
            .select()
            .from(dailyChecklistSettings)
            .where(eq(dailyChecklistSettings.userId, userId)),
        db
            .select()
            .from(dailyAdhkarCompletion)
            .where(
                and(
                    eq(dailyAdhkarCompletion.userId, userId),
                    gte(dailyAdhkarCompletion.localDate, from),
                    lte(dailyAdhkarCompletion.localDate, to),
                ),
            ),
        db
            .select({ resetAt: user.dataResetAt })
            .from(user)
            .where(eq(user.id, userId)),
    ]);
    const resetAt = account?.resetAt?.toISOString() ?? null;
    return {
        completions,
        settings: {
            visible: settings?.visible ?? [...CHECKLIST_CHOICES],
            revision: settings?.revision ?? 0,
            resetAt,
        },
    };
}

function adhkarForDate(
    state: Awaited<ReturnType<typeof readChecklistRange>>,
    date: string,
    timezone: string,
) {
    return DAILY_ADHKAR.map((category) => {
        const saved = state.completions.find(
            (row) => row.localDate === date && row.category === category,
        );
        return {
            category,
            date,
            timezone,
            completed: saved?.completed ?? false,
            revision: saved?.revision ?? 0,
            resetAt: state.settings.resetAt,
        };
    });
}

export async function getDailyChecklistState(
    userId: string,
    timezone: string,
    now = new Date(),
): Promise<DailyChecklistState> {
    const date = localChecklistDate(timezone, now);
    const state = await readChecklistRange(userId, date, date);
    return {
        date,
        timezone,
        settings: state.settings,
        adhkar: adhkarForDate(state, date, timezone),
    };
}

export async function getWeeklyAdhkarState(
    userId: string,
    weekStart: string,
    timezone: string,
    now = new Date(),
): Promise<WeeklyAdhkarState> {
    const dates = weekDates(weekStart);
    const state = await readChecklistRange(userId, dates[0], dates[6]);
    return {
        today: localChecklistDate(timezone, now),
        timezone,
        days: dates.map((date) => ({
            date,
            items: adhkarForDate(state, date, timezone).filter((item) =>
                state.settings.visible.includes(`adhkar.${item.category}`),
            ),
        })),
    };
}

export async function saveChecklistSettings(
    userId: string,
    input: ChecklistSettings,
) {
    return db.transaction(async (tx) => {
        if (!(await lockOwner(tx, userId, input.resetAt))) return stale;
        const [existing] = await tx
            .select()
            .from(dailyChecklistSettings)
            .where(eq(dailyChecklistSettings.userId, userId));
        if ((existing?.revision ?? 0) !== input.revision) return stale;
        const revision = input.revision + 1;
        await tx
            .insert(dailyChecklistSettings)
            .values({ userId, visible: input.visible, revision })
            .onConflictDoUpdate({
                target: dailyChecklistSettings.userId,
                set: { visible: input.visible, revision },
            });
        return { success: true as const, revision };
    });
}

export async function recordDailyAdhkar(
    userId: string,
    input: DailyAdhkarCompletion,
) {
    return db.transaction(async (tx) => {
        if (!(await lockOwner(tx, userId, input.resetAt))) return stale;
        const [settings] = await tx
            .select({ timezone: userSettings.adhkarTimezone })
            .from(userSettings)
            .where(eq(userSettings.userId, userId));
        const timezone =
            settings?.timezone ?? DEFAULT_PREFERENCES.adhkarTimezone;
        const result = await tx.execute<{ now: Date }>(
            sql`select clock_timestamp() as now`,
        );
        const date = localChecklistDate(timezone, new Date(result.rows[0].now));
        if (input.timezone !== timezone || input.date !== date)
            return { success: false as const, reason: "date" as const };
        const [existing] = await tx
            .select()
            .from(dailyAdhkarCompletion)
            .where(
                and(
                    eq(dailyAdhkarCompletion.userId, userId),
                    eq(dailyAdhkarCompletion.localDate, date),
                    eq(dailyAdhkarCompletion.category, input.category),
                ),
            );
        if ((existing?.revision ?? 0) !== input.revision) return stale;
        const revision = input.revision + 1;
        await tx
            .insert(dailyAdhkarCompletion)
            .values({
                userId,
                localDate: date,
                category: input.category,
                completed: input.completed,
                revision,
            })
            .onConflictDoUpdate({
                target: [
                    dailyAdhkarCompletion.userId,
                    dailyAdhkarCompletion.localDate,
                    dailyAdhkarCompletion.category,
                ],
                set: { completed: input.completed, revision },
            });
        return { success: true as const, revision };
    });
}
