import type { RevisionView } from "@/features/revision/server/service";
import type { MemorizationPlanView } from "./server/service";

export type TodayPlanSession = {
    id: string;
    kind: "memorization" | "revision";
    riwayah: "hafs" | "warsh";
    scheduledDate: string;
    timezone: string;
    startSurahNumber: number;
    startAyahNumber: number;
    endSurahNumber: number;
    endAyahNumber: number;
    started: boolean;
    credited: number;
    total: number;
    done: boolean;
};

export function todayPlanSessions(
    memorization: MemorizationPlanView,
    revision: RevisionView,
    includeCompleted = false,
): TodayPlanSession[] {
    const result: TodayPlanSession[] = [];
    for (const [kind, view] of [
        ["memorization", memorization],
        ["revision", revision],
    ] as const) {
        if (!view.week) continue;
        for (const item of view.sessions) {
            if (item.scheduledDate !== view.today) continue;
            if (
                !(view.plan?.enabled && item.active) &&
                !(includeCompleted && item.done)
            )
                continue;
            result.push({
                id: item.id,
                kind,
                riwayah: view.week.riwayah,
                scheduledDate: item.scheduledDate,
                timezone: view.week.timezone,
                startSurahNumber: item.startSurahNumber,
                startAyahNumber: item.startAyahNumber,
                endSurahNumber: item.endSurahNumber,
                endAyahNumber: item.endAyahNumber,
                started: Boolean(
                    item.progressSurahNumber && item.progressAyahNumber,
                ),
                credited: "peer" in item ? item.peer : item.completed,
                total: item.total,
                done: item.done,
            });
        }
    }
    return result;
}
