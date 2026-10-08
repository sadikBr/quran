import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import { recurringOccurrence, recurringPlan } from "@/drizzle/schema";
import { lockRecord } from "@/features/memorization/server/record-service";
import {
    occursOn,
    type RecurringSettings,
    type RecurringState,
    recurringToday,
} from "../recurrence";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function getRecurringState(
    userId: string,
    from?: string,
    through?: string,
    tx: typeof db | Tx = db,
): Promise<RecurringState> {
    const [plans, rows] = await Promise.all([
        tx
            .select()
            .from(recurringPlan)
            .where(eq(recurringPlan.userId, userId))
            .orderBy(asc(recurringPlan.id)),
        tx
            .select({ occurrence: recurringOccurrence })
            .from(recurringOccurrence)
            .innerJoin(
                recurringPlan,
                eq(recurringPlan.id, recurringOccurrence.planId),
            )
            .where(
                and(
                    eq(recurringPlan.userId, userId),
                    from ? gte(recurringOccurrence.localDate, from) : undefined,
                    through
                        ? lte(recurringOccurrence.localDate, through)
                        : undefined,
                ),
            )
            .orderBy(
                desc(recurringOccurrence.localDate),
                asc(recurringOccurrence.planId),
            )
            .limit(from ? 1000 : 100),
    ]);
    return { plans, occurrences: rows.map((row) => row.occurrence) };
}

async function clock(tx: Tx) {
    const result = await tx.execute<{ now: Date }>(
        sql`select clock_timestamp() as now`,
    );
    return new Date(result.rows[0].now);
}

export async function saveRecurringPlan(
    userId: string,
    id: string,
    revision: number | null,
    settings: RecurringSettings,
) {
    return db.transaction(async (tx) => {
        // All personal schedule writes use this lock, including weekly planning and account resets.
        await lockRecord(tx, userId);
        const [existing] = await tx
            .select()
            .from(recurringPlan)
            .where(
                and(eq(recurringPlan.id, id), eq(recurringPlan.userId, userId)),
            )
            .for("update");
        if (revision !== null) {
            if (
                !existing ||
                existing.archived ||
                existing.revision !== revision
            )
                return { success: false as const, reason: "stale" as const };
            await tx
                .update(recurringPlan)
                .set({ ...settings, revision: existing.revision + 1 })
                .where(eq(recurringPlan.id, id));
        } else {
            const [{ count }] = await tx
                .select({ count: sql<number>`count(*)::int` })
                .from(recurringPlan)
                .where(
                    and(
                        eq(recurringPlan.userId, userId),
                        eq(recurringPlan.archived, false),
                    ),
                );
            if (count >= 40)
                return { success: false as const, reason: "limit" as const };
            const inserted = await tx
                .insert(recurringPlan)
                .values({
                    id,
                    userId,
                    ...settings,
                    startDate: recurringToday(settings, await clock(tx)),
                })
                .onConflictDoNothing()
                .returning({ id: recurringPlan.id });
            if (!inserted.length)
                return { success: false as const, reason: "stale" as const };
        }
        return { success: true as const };
    });
}

export async function changeRecurringPlan(
    userId: string,
    id: string,
    revision: number,
    action: "pause" | "resume" | "archive",
) {
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const changed = await tx
            .update(recurringPlan)
            .set({
                enabled: action === "resume",
                archived: action === "archive",
                revision: revision + 1,
            })
            .where(
                and(
                    eq(recurringPlan.id, id),
                    eq(recurringPlan.userId, userId),
                    eq(recurringPlan.revision, revision),
                    eq(recurringPlan.archived, false),
                ),
            )
            .returning({ id: recurringPlan.id });
        return changed.length
            ? { success: true as const }
            : { success: false as const, reason: "stale" as const };
    });
}

export async function recordRecurringOccurrence(
    userId: string,
    id: string,
    revision: number,
    date: string,
    status: "completed" | "skipped" | "pending",
) {
    return db.transaction(async (tx) => {
        await lockRecord(tx, userId);
        const [plan] = await tx
            .select()
            .from(recurringPlan)
            .where(
                and(eq(recurringPlan.id, id), eq(recurringPlan.userId, userId)),
            )
            .for("update");
        if (!plan || plan.revision !== revision)
            return { success: false as const, reason: "stale" as const };
        const now = await clock(tx);
        if (date !== recurringToday(plan, now))
            return { success: false as const, reason: "date" as const };
        const key = and(
            eq(recurringOccurrence.planId, id),
            eq(recurringOccurrence.localDate, date),
        );
        const [existing] = await tx
            .select()
            .from(recurringOccurrence)
            .where(key);
        if (status === "pending") {
            if (!existing)
                return { success: false as const, reason: "stale" as const };
            await tx.delete(recurringOccurrence).where(key);
        } else {
            if (existing || !occursOn(plan, date))
                return { success: false as const, reason: "stale" as const };
            const {
                title,
                notes,
                timezone,
                minutes,
                surahNumber,
                resourceUrl,
            } = plan;
            await tx.insert(recurringOccurrence).values({
                planId: id,
                localDate: date,
                status,
                recordedAt: now,
                snapshot: {
                    title,
                    notes,
                    timezone,
                    minutes,
                    surahNumber,
                    resourceUrl,
                },
            });
        }
        await tx
            .update(recurringPlan)
            .set({ revision: plan.revision + 1 })
            .where(eq(recurringPlan.id, id));
        return { success: true as const };
    });
}
