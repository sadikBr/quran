import "server-only";
import { DateTime } from "luxon";
import { getMemorizationPlanView } from "@/features/learning/server/service";
import { todayPlanSessions } from "@/features/learning/today-practice";
import { getChecklistPracticeAssignments } from "@/features/practice/server/get-practice-assignment";
import { getRevisionView } from "@/features/revision/server/service";
import type getPreferences from "@/features/settings/server/get-preferences";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import getWirdDate from "@/features/wird/server/wird-date";
import type { TodayTask } from "../daily-checklist";
import { localChecklistDate } from "../daily-checklist";
import { recurringPlanningTasks } from "../recurrence";
import { practiceChecklistState } from "../today-practice";
import { getDailyChecklistState } from "./daily-checklist-service";
import { getRecurringState } from "./service";

export async function getTodayPlanView(
    userId: string,
    preferences: Awaited<ReturnType<typeof getPreferences>>,
) {
    const now = new Date();
    const today = localChecklistDate(preferences.adhkarTimezone, now);
    const [memorization, revision, wird, recurring, assignments, checklist] =
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
            getChecklistPracticeAssignments(
                userId,
                today,
                preferences.adhkarTimezone,
            ),
            getDailyChecklistState(userId, preferences.adhkarTimezone, now),
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
    const tasks: TodayTask[] = todayPlanSessions(
        memorization,
        revision,
        true,
    ).map((session) => ({
        ...base,
        id: `${session.kind}:${session.id}`,
        kind: session.kind,
        date: session.scheduledDate,
        timezone: session.timezone,
        done: session.done,
        ranges: [session],
        href: session.done
            ? null
            : `/practice/${session.kind}/${session.id}/read`,
    }));
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
    for (const item of assignments) {
        const completion = practiceChecklistState(
            item,
            today,
            preferences.adhkarTimezone,
        );
        if (!completion) continue;
        tasks.push({
            ...base,
            id: `assignment:${item.id}`,
            kind: item.source === "group" ? "circle" : "practice",
            date: today,
            timezone: preferences.adhkarTimezone,
            ...completion,
            groupName: item.groupName,
            ranges: [
                {
                    startSurahNumber: item.start.surahNumber,
                    startAyahNumber: item.start.ayahNumber,
                    endSurahNumber: item.end.surahNumber,
                    endAyahNumber: item.end.ayahNumber,
                },
            ],
            href: completion.done
                ? item.source === "group"
                    ? "/assignments"
                    : null
                : `/practice/${item.id}/read`,
        });
    }
    tasks.push(...recurringPlanningTasks(recurring, null, {}, now));
    tasks.push(
        ...checklist.adhkar.map((adhkar) => ({
            ...base,
            id: `adhkar:${adhkar.category}:${adhkar.date}`,
            kind: "adhkar" as const,
            date: adhkar.date,
            timezone: adhkar.timezone,
            done: adhkar.completed,
            adhkar,
            href: `/azkar?category=${adhkar.category}&from=today`,
        })),
    );
    return { tasks, checklist };
}
