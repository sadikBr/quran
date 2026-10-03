import "server-only";
import { and, eq, gte, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import db from "@/drizzle/db";
import {
    memorizationMistake,
    memorizationMistakeEvent,
    memorizationPlan,
    memorizationSession,
    memorizationWeek,
    revisionPlan,
    revisionSession,
    revisionWeek,
} from "@/drizzle/schema";
import {
    assessmentVerses,
    isMemorized,
    type Riwayah,
} from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import { revisionCoverage, weekPeerAtoms } from "@/features/revision/schedule";
import { weeklyLearningSummary } from "../activity";
import { retentionState } from "./state";

export async function getWeeklyReport(
    userId: string,
    riwayah: Riwayah,
    offset: number,
    now = new Date(),
) {
    const catalogue = await getMemoryCatalogue();
    return db.transaction(
        async (tx) => {
            const [[learning], [revision]] = await Promise.all([
                tx
                    .select()
                    .from(memorizationPlan)
                    .where(eq(memorizationPlan.userId, userId)),
                tx
                    .select()
                    .from(revisionPlan)
                    .where(eq(revisionPlan.userId, userId)),
            ]);
            const timezone =
                revision?.timezone ?? learning?.timezone ?? "Africa/Casablanca";
            const start = DateTime.fromJSDate(now, { zone: timezone })
                .startOf("week")
                .plus({ weeks: offset });
            const end = start.plus({ weeks: 1 });
            const state = await retentionState(
                userId,
                catalogue,
                timezone,
                now,
                tx,
            );
            const [memorizationSessions, revisionSessions, mistakes] =
                await Promise.all([
                    tx
                        .select({
                            session: memorizationSession,
                            week: memorizationWeek,
                        })
                        .from(memorizationSession)
                        .innerJoin(
                            memorizationWeek,
                            eq(memorizationSession.weekId, memorizationWeek.id),
                        )
                        .where(eq(memorizationSession.userId, userId)),
                    tx
                        .select({
                            session: revisionSession,
                            week: revisionWeek,
                        })
                        .from(revisionSession)
                        .innerJoin(
                            revisionWeek,
                            eq(revisionSession.weekId, revisionWeek.id),
                        )
                        .where(eq(revisionSession.userId, userId)),
                    tx
                        .select({
                            event: memorizationMistakeEvent,
                            mistake: memorizationMistake,
                        })
                        .from(memorizationMistakeEvent)
                        .innerJoin(
                            memorizationMistake,
                            eq(
                                memorizationMistakeEvent.mistakeId,
                                memorizationMistake.id,
                            ),
                        )
                        .where(
                            and(
                                eq(memorizationMistakeEvent.userId, userId),
                                gte(
                                    memorizationMistakeEvent.createdAt,
                                    start.toJSDate(),
                                ),
                                lt(
                                    memorizationMistakeEvent.createdAt,
                                    end.toJSDate(),
                                ),
                            ),
                        ),
                ]);
            const inWeek = (date: Date | null) =>
                date !== null &&
                +date >= +start &&
                +date < +end &&
                +date <= +now;
            const scheduledInWeek = (s: { scheduledDate: string }) =>
                s.scheduledDate >= (start.toISODate() as string) &&
                s.scheduledDate < (end.toISODate() as string);
            const difficulty = new Map<
                string,
                {
                    id: string;
                    surahNumber: number;
                    ayahNumber: number;
                    riwayah: Riwayah;
                    kind: "word" | "continuation" | "transition";
                    count: number;
                }
            >();
            for (const { event, mistake } of mistakes) {
                if (event.action !== "noticed") continue;
                const previous = difficulty.get(mistake.id);
                difficulty.set(mistake.id, {
                    id: mistake.id,
                    surahNumber: mistake.surahNumber,
                    ayahNumber: mistake.ayahNumber,
                    riwayah: mistake.riwayah,
                    kind: mistake.kind,
                    count: (previous?.count ?? 0) + 1,
                });
            }
            const followUps = catalogue[riwayah]
                .filter((v) => isMemorized(v, state.covered))
                .flatMap((v) => {
                    const due = v.atoms
                        .map((a) => state.followUps.get(a))
                        .filter((a) => a !== undefined)
                        .sort((a, b) => a.due.localeCompare(b.due))[0];
                    return due
                        ? [
                              {
                                  surahNumber: v.surahNumber,
                                  ayahNumber: v.ayahNumber,
                                  ...due,
                              },
                          ]
                        : [];
                });
            return {
                offset,
                weekStart: start.toISODate() as string,
                weekEnd: end.minus({ days: 1 }).toISODate() as string,
                timezone,
                riwayah,
                ...weeklyLearningSummary(
                    state.activity,
                    catalogue[riwayah],
                    start.toISODate() as string,
                    timezone,
                    mistakes
                        .filter(
                            ({ event }) =>
                                event.action === "practised" &&
                                inWeek(event.createdAt),
                        )
                        .map(({ event }) => event.createdAt),
                ),
                completedMemorization: memorizationSessions.filter(
                    ({ session: s }) => inWeek(s.completedAt),
                ).length,
                completedRevision: revisionSessions.filter(({ session: s }) =>
                    inWeek(s.completedAt),
                ).length,
                // These are still-open portions from this week, not an immutable historical snapshot.
                pendingMemorization: memorizationSessions.filter(
                    ({ session: s, week }) =>
                        !s.completedAt &&
                        scheduledInWeek(s) &&
                        assessmentVerses(catalogue, {
                            ...s,
                            riwayah: week.riwayah,
                        }).some((v) => !isMemorized(v, state.covered)),
                ).length,
                pendingRevision: revisionSessions.filter(
                    ({ session: s, week }) => {
                        const range = { ...s, riwayah: week.riwayah };
                        return (
                            !s.completedAt &&
                            scheduledInWeek(s) &&
                            assessmentVerses(catalogue, range).every((v) =>
                                isMemorized(v, state.covered),
                            ) &&
                            !revisionCoverage(
                                catalogue,
                                range,
                                weekPeerAtoms(
                                    catalogue,
                                    state.assessments,
                                    week.weekStart,
                                    week.timezone,
                                    now,
                                    s.reviewAfter,
                                ),
                            ).done
                        );
                    },
                ).length,
                focusedPractices: mistakes.filter(
                    ({ event }) => event.action === "practised",
                ).length,
                mistakes: [...difficulty.values()]
                    .sort(
                        (a, b) =>
                            b.count - a.count ||
                            a.surahNumber - b.surahNumber ||
                            a.ayahNumber - b.ayahNumber,
                    )
                    .slice(0, 8),
                followUps: followUps.length,
                nextFollowUp: followUps.map((v) => v.due).sort()[0] ?? null,
                learningEnabled: learning?.enabled ?? false,
                revisionEnabled: revision?.enabled ?? false,
                quartersPerWeek: learning?.quartersPerWeek ?? null,
            };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
    );
}
export type WeeklyReport = Awaited<ReturnType<typeof getWeeklyReport>>;
