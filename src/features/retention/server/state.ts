import "server-only";
import { asc, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    memorizationAssessment,
    memorizationBaselineChange,
    memorizationRecord,
    userMemorizedHizb,
} from "@/drizzle/schema";
import {
    baselineAtoms,
    type MemoryCatalogue,
    memorizedAtoms,
} from "@/features/memorization/progress";
import { learningActivity } from "../activity";

export async function retentionState(
    userId: string,
    catalogue: MemoryCatalogue,
    timezone: string,
    now: Date,
    reader: Pick<typeof db, "select"> = db,
) {
    const [[record], baseline, assessments, baselineEvents] = await Promise.all(
        [
            reader
                .select()
                .from(memorizationRecord)
                .where(eq(memorizationRecord.userId, userId)),
            reader
                .select()
                .from(userMemorizedHizb)
                .where(eq(userMemorizedHizb.userId, userId)),
            reader
                .select()
                .from(memorizationAssessment)
                .where(eq(memorizationAssessment.userId, userId))
                .orderBy(
                    asc(memorizationAssessment.createdAt),
                    asc(memorizationAssessment.id),
                ),
            reader
                .select()
                .from(memorizationBaselineChange)
                .where(eq(memorizationBaselineChange.userId, userId))
                .orderBy(
                    asc(memorizationBaselineChange.createdAt),
                    asc(memorizationBaselineChange.id),
                ),
        ],
    );
    const riwayah = record?.baselineRiwayah ?? "hafs";
    const hizbs = baseline.map((b) => b.hizbNumber);
    const covered = memorizedAtoms(
        catalogue,
        riwayah,
        hizbs,
        assessments,
        record?.baselineRanges ?? [],
    );
    const evidence = learningActivity({
        catalogue,
        baselineRiwayah: riwayah,
        baselineEvents,
        assessments,
        timezone,
        now,
        initialCovered: baselineEvents.length
            ? undefined
            : baselineAtoms(
                  catalogue[riwayah],
                  hizbs,
                  record?.baselineRanges ?? [],
              ),
    });
    return { ...evidence, covered, assessments, record };
}
