import "server-only";
import { createHash } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import type db from "@/drizzle/db";
import {
    learningSchedule,
    memorizationPlan,
    memorizationRecord,
    memorizationSession,
    memorizationWeek,
    revisionPlan,
    revisionSession,
    revisionWeek,
} from "@/drizzle/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Kind = "memorization" | "revision";

// Include session IDs and reading positions so a stale preview cannot discard new work,
// or delete a different plan created since the confirmation was opened.
export async function planVersion(tx: Tx, userId: string, kind: Kind) {
    const plan = kind === "memorization" ? memorizationPlan : revisionPlan;
    const week = kind === "memorization" ? memorizationWeek : revisionWeek;
    const session =
        kind === "memorization" ? memorizationSession : revisionSession;
    const state = await Promise.all([
        tx.select().from(plan).where(eq(plan.userId, userId)),
        tx
            .select()
            .from(week)
            .where(eq(week.userId, userId))
            .orderBy(asc(week.id)),
        tx
            .select()
            .from(session)
            .where(eq(session.userId, userId))
            .orderBy(asc(session.id)),
        tx
            .select()
            .from(learningSchedule)
            .where(eq(learningSchedule.userId, userId)),
        tx
            .select()
            .from(memorizationRecord)
            .where(eq(memorizationRecord.userId, userId)),
    ]);
    return createHash("sha256")
        .update(JSON.stringify({ kind, userId, state }))
        .digest("hex");
}

// Call only while holding the member's record lock. Assessments are independent
// immutable records and intentionally survive removal of scheduled sessions.
export async function clearPlanSchedule(tx: Tx, userId: string, kind: Kind) {
    const week = kind === "memorization" ? memorizationWeek : revisionWeek;
    await tx.delete(week).where(eq(week.userId, userId));
}

export function regenerationCalendar(
    fromDate: string,
    days: number[],
    timezone: string,
) {
    let day = DateTime.fromISO(fromDate, { zone: timezone });
    if (days.length)
        while (!days.includes(day.weekday)) day = day.plus({ days: 1 });
    return {
        fromDate: day.toISODate() as string,
        weekStart: day.startOf("week").toISODate() as string,
    };
}
