"use server";

import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import getPreferences from "@/features/settings/server/get-preferences";
import getAssignmentReview from "./get-assignment-review";
import getReviewQueue from "./get-review-queue";

export default async function loadMeetingReview(
    groupId: string,
    assignmentId?: string,
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Unauthorized");
    // Queue and assignment lookups both enforce circle supervisor membership.
    const queue = await getReviewQueue(groupId, session.user.id);
    const selectedId =
        assignmentId && queue.some((item) => item.id === assignmentId)
            ? assignmentId
            : queue[0]?.id;
    if (!selectedId) return null;
    const review = await getAssignmentReview(
        groupId,
        selectedId,
        session.user.id,
    );
    if (!review || review.assignment.status !== "submitted") return null;
    const preferences = await getPreferences();
    const readerGroups = await getPracticeReaderData(review.assignment, {
        ...preferences,
        showTranslation: false,
    });
    return { review, readerGroups, pendingCount: queue.length };
}
