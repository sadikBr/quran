import type {
    userKhatmahPlan,
    userWird,
    userWirdHistory,
} from "@/drizzle/schema";
import {
    buildAdaptiveKhatmahTarget,
    shiftDate,
} from "@/features/khatmah/server/calculate-khatmah";
import type { KhatmahMeasurement } from "@/features/khatmah/types";
import type {
    MemoryCatalogue,
    Riwayah,
} from "@/features/memorization/progress";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import type { SurahType } from "@/features/quran/types";
import buildWirdTarget, {
    TOTAL_QURAN_AYAHS,
} from "@/features/wird/server/build-wird-target";
import getWirdDate from "@/features/wird/server/wird-date";
import type { WirdUnit } from "@/features/wird/types";
import type { PlanningTask } from "./planner";

type Portion = Pick<
    typeof userWird.$inferSelect,
    "targetStartGlobalAyah" | "targetEndGlobalAyah"
>;

/** Read-only forecast: it never advances the saved portion or records completion. */
export function buildWirdPlanningTasks({
    record,
    plan,
    history,
    dates,
    today,
    navigation,
    surahs,
    catalogue,
    riwayah,
    estimates,
}: {
    record: typeof userWird.$inferSelect | null;
    plan: typeof userKhatmahPlan.$inferSelect | null;
    history: (typeof userWirdHistory.$inferSelect)[];
    dates: string[];
    today: string;
    navigation: QuranNavigationMeta;
    surahs: SurahType[];
    catalogue: MemoryCatalogue;
    riwayah: Riwayah;
    estimates: Record<string, number>;
}): PlanningTask[] {
    const tasks: PlanningTask[] = [];
    function add(
        date: string,
        portions: Portion[],
        done: boolean,
        projected: boolean,
    ) {
        if (!dates.includes(date)) return;
        let minutes = 0;
        const ranges = portions.flatMap((portion) => {
            // Wird cursors use canonical Hafs numbering; Warsh cards follow the reader's correspondence.
            const source = catalogue.hafs.slice(
                portion.targetStartGlobalAyah - 1,
                portion.targetEndGlobalAyah,
            );
            const atoms = new Set(source.flatMap((verse) => verse.atoms));
            const verses =
                riwayah === "hafs"
                    ? source
                    : catalogue.warsh.filter((verse) =>
                          verse.atoms.some((atom) => atoms.has(atom)),
                      );
            const first = verses[0],
                last = verses.at(-1);
            if (!first || !last) return [];
            minutes += Math.max(1, last.page - first.page + 1) * 2;
            return [
                {
                    startSurahNumber: first.surahNumber,
                    startAyahNumber: first.ayahNumber,
                    endSurahNumber: last.surahNumber,
                    endAyahNumber: last.ayahNumber,
                },
            ];
        });
        const id = `wird:${date}`;
        tasks.push({
            id,
            kind: "wird",
            date,
            ranges,
            minutes:
                estimates[id] ??
                Math.min(480, Math.max(5, Math.ceil(minutes / 5) * 5)),
            done,
            movable: false,
            estimateEditable: !done,
            wirdProjected: projected,
            minDate: date,
            maxDate: date,
            timezone: "Africa/Casablanca",
            deadline: null,
            groupName: null,
            sequence: null,
            sessionIds: [],
            href: !done && date === today ? "/wird/read" : null,
        });
    }

    const completed = new Map<string, Portion[]>();
    const completions = [...history];
    if (
        record?.completedAt &&
        !history.some(
            (entry) =>
                entry.targetDate === record.targetDate &&
                entry.targetStartGlobalAyah === record.targetStartGlobalAyah &&
                entry.targetEndGlobalAyah === record.targetEndGlobalAyah,
        )
    )
        completions.push({
            ...record,
            id: "current",
            completedAt: record.completedAt,
        });
    for (const entry of completions) {
        const date = getWirdDate(entry.completedAt);
        completed.set(date, [...(completed.get(date) ?? []), entry]);
    }
    for (const [date, portions] of completed) add(date, portions, true, false);
    if (
        !record ||
        (record.completedAt && plan?.completedAt && !record.nextGoal)
    )
        return tasks;

    const activePlan = plan?.isActive ? { ...plan } : null;
    let cursor =
        record.targetEndGlobalAyah >= TOTAL_QURAN_AYAHS
            ? 1
            : record.targetEndGlobalAyah + 1;
    const nextPortion = (date: string): Portion => {
        const adaptive = activePlan
            ? buildAdaptiveKhatmahTarget(
                  {
                      ...activePlan,
                      measurement: activePlan.measurement as KhatmahMeasurement,
                  },
                  date,
                  navigation,
                  surahs,
              )
            : null;
        const target =
            adaptive ??
            buildWirdTarget(
                (record.nextGoal?.unit ?? record.unit) as WirdUnit,
                record.nextGoal?.amount ?? record.amount,
                cursor,
                navigation,
                surahs,
            );
        if (activePlan && adaptive) activePlan.targetDate = adaptive.targetDate;
        return {
            targetStartGlobalAyah: target.startGlobalAyah,
            targetEndGlobalAyah: target.endGlobalAyah,
        };
    };
    let date = record.completedAt
        ? ([today, shiftDate(getWirdDate(record.completedAt), 1)]
              .sort()
              .at(-1) as string)
        : ([today, record.targetDate].sort().at(-1) as string);
    let portion: Portion = record.completedAt ? nextPortion(date) : record;
    let projected = Boolean(record.completedAt);
    // Only forecast through the selected week, assuming one completed portion each day.
    while (date <= dates[6]) {
        if (!completed.has(date)) add(date, [portion], false, projected);
        const finishedQuran = portion.targetEndGlobalAyah >= TOTAL_QURAN_AYAHS;
        if (activePlan && finishedQuran && !activePlan.repeatable) break;
        cursor = finishedQuran ? 1 : portion.targetEndGlobalAyah + 1;
        if (activePlan) {
            activePlan.currentGlobalAyah = cursor;
            if (finishedQuran)
                activePlan.targetDate = shiftDate(
                    date,
                    activePlan.durationWeeks * 7,
                );
        }
        date = shiftDate(date, 1);
        if (date > dates[6]) break;
        portion = nextPortion(date);
        projected = true;
    }
    return tasks;
}
