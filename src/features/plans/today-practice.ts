import { DateTime } from "luxon";
import type { PracticeAssignment } from "@/features/practice/types";

export function practiceIsDueToday(
    item: Pick<PracticeAssignment, "status" | "plannedDate" | "dueAt">,
    today: string,
    timezone: string,
) {
    if (item.status === "submitted" || item.status === "completed")
        return false;
    const deadline = item.dueAt
        ? DateTime.fromJSDate(item.dueAt, { zone: timezone }).toISODate()
        : null;
    const dates = [item.plannedDate, deadline].filter((date): date is string =>
        Boolean(date),
    );
    // Unscheduled personal passages and circle work are ready to start now.
    return dates.length === 0 || dates.some((date) => date <= today);
}

/** Finished work belongs to its completion day, or its scheduled day if done early. */
export function practiceChecklistState(
    item: Pick<
        PracticeAssignment,
        "status" | "plannedDate" | "dueAt" | "submittedAt" | "reviewedAt"
    >,
    today: string,
    timezone: string,
) {
    const submitted = item.status === "submitted";
    if (!submitted && item.status !== "completed")
        return practiceIsDueToday(item, today, timezone)
            ? { done: false, submitted: false }
            : null;
    const localDate = (value: Date | null) =>
        value
            ? DateTime.fromJSDate(value, { zone: timezone }).toISODate()
            : null;
    const completedOn = localDate(
        submitted ? item.submittedAt : (item.reviewedAt ?? item.submittedAt),
    );
    const dueToday =
        item.plannedDate === today || localDate(item.dueAt) === today;
    return completedOn === today ||
        (completedOn && completedOn < today && dueToday)
        ? { done: true, submitted }
        : null;
}
