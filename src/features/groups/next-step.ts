type Assignment = {
    id: string;
    status: string;
    reviewNote: string | null;
    dueAt?: Date | string | null;
};

export function circleNextStep({
    groupId,
    supervisor,
    live,
    scheduled,
    memberCount,
    assignments,
    nextStartsAt,
    pendingAbsence = false,
    pendingAbsenceReviews = false,
}: {
    groupId: string;
    supervisor: boolean;
    live: boolean;
    scheduled: boolean;
    memberCount: number;
    assignments: Assignment[];
    nextStartsAt?: string | null;
    pendingAbsence?: boolean;
    pendingAbsenceReviews?: boolean;
}) {
    const base = `/groups/${groupId}`;
    if (live) return { label: "join" as const, href: `${base}/meeting` };
    if (pendingAbsence)
        return {
            label: "provideExcuse" as const,
            href: `${base}#absence-excuse`,
        };
    if (supervisor) {
        if (pendingAbsenceReviews)
            return {
                label: "reviewAbsences" as const,
                href: `${base}/history?pending=1`,
            };
        if (!scheduled)
            return {
                label: "setup" as const,
                href: `${base}#meeting-schedule`,
            };
        if (memberCount < 2)
            return { label: "invite" as const, href: `${base}#invite-members` };
        const ready = assignments.find((item) => item.status === "submitted");
        if (ready)
            return {
                label: "awaitingRecitation" as const,
                action: "viewMeeting" as const,
                href: `${base}#meeting-overview`,
            };
        if (
            nextStartsAt &&
            assignments.some(
                (item) =>
                    item.status !== "completed" &&
                    item.dueAt &&
                    new Date(item.dueAt).getTime() ===
                        new Date(nextStartsAt).getTime(),
            )
        )
            return {
                label: "meetingReady" as const,
                action: "viewMeeting" as const,
                href: `${base}#meeting-overview`,
            };
        return { label: "plan" as const, href: `${base}/plan` };
    }
    const revision = assignments.find(
        (item) =>
            item.status === "needs_revision" || item.status === "not_completed",
    );
    if (revision)
        return {
            label: "feedback" as const,
            href: `/practice/${revision.id}/read`,
        };
    const active = assignments.find((item) => item.status === "in_progress");
    if (active)
        return {
            label: "prepare" as const,
            href: `/practice/${active.id}/read`,
        };
    if (assignments.some((item) => item.status === "submitted"))
        return {
            label: "awaiting" as const,
            href: `/assignments?group=${groupId}`,
            action: "continue" as const,
        };
    if (assignments.some((item) => item.status === "completed"))
        return { label: "results" as const, href: `${base}#your-feedback` };
    return { label: "waiting" as const, href: null };
}
