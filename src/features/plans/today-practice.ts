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
