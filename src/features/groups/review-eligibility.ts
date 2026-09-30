export function canReviewAssignment(
    status: string,
    dueAt: Date | string | null,
    now = Date.now(),
) {
    if (status === "submitted") return true;
    return (
        ["in_progress", "needs_revision"].includes(status) &&
        dueAt !== null &&
        new Date(dueAt).getTime() <= now
    );
}
