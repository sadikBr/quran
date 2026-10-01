import type { MeetingScheduleSlot } from "../meeting-types";
import { getUpcomingMeetingOccurrences } from "./meeting-schedule";

export function getRevisionMeetingDate(
    meeting: {
        schedule: MeetingScheduleSlot[];
        timezone: string;
        enabled: boolean;
        rescheduledOccurrences?: Array<{ from: string; to: string }>;
    } | null,
    previousDueAt: Date | null,
    now = new Date(),
) {
    if (!meeting) return null;
    // Never reuse the original meeting, even when reviewed early. Late reviews
    // move to the next future occurrence rather than another past deadline.
    const after = new Date(
        Math.max(now.getTime(), previousDueAt?.getTime() ?? 0),
    );
    const [next] = getUpcomingMeetingOccurrences({
        ...meeting,
        now: after,
        limit: 1,
    });
    return next ? new Date(next) : null;
}
