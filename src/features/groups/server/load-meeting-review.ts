"use server";

import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import getPreferences from "@/features/settings/server/get-preferences";
import getAssignmentReview from "./get-assignment-review";
import getReviewQueue from "./get-review-queue";
import { getLiveReviewContext } from "./live-review-context";

export default async function loadMeetingReview(
    groupId: string,
    occurrence: string,
    assignmentId?: string,
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Unauthorized");
    // Queue and assignment lookups both enforce circle supervisor membership.
    if (!(await getLiveReviewContext(groupId, session.user.id, occurrence)))
        throw new Error("Meeting review unavailable");
    const queue = await getReviewQueue(groupId, session.user.id, occurrence);
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
    if (!review) return null;
    const preferences = await getPreferences();
    const readerGroups = await getPracticeReaderData(review.assignment, {
        ...preferences,
        showTranslation: false,
    });
    return { review, readerGroups, pendingCount: queue.length, queue };
}
