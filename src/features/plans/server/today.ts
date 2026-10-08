import "server-only";
import { DateTime } from "luxon";
import { getMemorizationPlanView } from "@/features/learning/server/service";
import { todayPlanSessions } from "@/features/learning/today-practice";
import type { PlanningTask } from "@/features/planning/planner";
import {
    getAssignedPracticeAssignments,
    getPracticeAssignments,
} from "@/features/practice/server/get-practice-assignment";
import { getRevisionView } from "@/features/revision/server/service";
import type getPreferences from "@/features/settings/server/get-preferences";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import getWirdDate from "@/features/wird/server/wird-date";
import { recurringPlanningTasks } from "../recurrence";
import { practiceIsDueToday } from "../today-practice";
import { getRecurringState } from "./service";

export async function getTodayPlanTasks(
    userId: string,
    preferences: Awaited<ReturnType<typeof getPreferences>>,
) {
    const now = new Date();
    const [memorization, revision, wird, recurring, personal, assigned] =
        await Promise.all([
            getMemorizationPlanView(userId, preferences.riwayah),
            getRevisionView(userId, preferences.riwayah),
            getDailyWird(userId, preferences.arabicEdition),
            getRecurringState(
                userId,
                DateTime.fromJSDate(now, { zone: "UTC" })
                    .minus({ days: 1 })
                    .toISODate() as string,
                DateTime.fromJSDate(now, { zone: "UTC" })
                    .plus({ days: 1 })
                    .toISODate() as string,
            ),
            getPracticeAssignments(userId),
            getAssignedPracticeAssignments(userId),
        ]);
    const base = {
        movable: false,
        deadline: null,
        groupName: null,
        sequence: null,
        sessionIds: [],
        ranges: [],
        minDate: "",
        maxDate: "",
        minutes: 0,
    };
    const tasks: PlanningTask[] = todayPlanSessions(memorization, revision).map(
        (session) => ({
            ...base,
            id: `${session.kind}:${session.id}`,
            kind: session.kind,
            date: session.scheduledDate,
            timezone: session.timezone,
            done: false,
            ranges: [session],
            href: `/practice/${session.kind}/${session.id}/read`,
        }),
    );
    if (wird && !wird.scheduledForFuture)
        tasks.unshift({
            ...base,
            id: "wird:today",
            kind: "wird",
            date: getWirdDate(now),
            timezone: "Africa/Casablanca",
            done: wird.completed,
            ranges: [
                {
                    startSurahNumber: wird.start.surahNumber,
                    startAyahNumber: wird.start.ayahNumber,
                    endSurahNumber: wird.end.surahNumber,
                    endAyahNumber: wird.end.ayahNumber,
                },
            ],
            href: wird.completed ? "" : "/wird/read",
        });
    const today = DateTime.fromJSDate(now, {
        zone: preferences.adhkarTimezone,
    }).toISODate() as string;
    for (const item of [...personal, ...assigned]) {
        if (!practiceIsDueToday(item, today, preferences.adhkarTimezone))
            continue;
        tasks.push({
            ...base,
            id: `assignment:${item.id}`,
            kind: item.source === "group" ? "circle" : "practice",
            date: today,
            timezone: preferences.adhkarTimezone,
            done: false,
            groupName: item.groupName,
            ranges: [
                {
                    startSurahNumber: item.start.surahNumber,
                    startAyahNumber: item.start.ayahNumber,
                    endSurahNumber: item.end.surahNumber,
                    endAyahNumber: item.end.ayahNumber,
                },
            ],
            href: `/practice/${item.id}/read`,
        });
    }
    tasks.push(...recurringPlanningTasks(recurring, null, {}, now));
    return tasks.sort((a, b) => Number(a.done) - Number(b.done));
}
