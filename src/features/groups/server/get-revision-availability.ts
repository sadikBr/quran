"use server";
import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import getAssignmentReview from "./get-assignment-review";
import { getGroupMeetingForUser } from "./get-group-meeting";
import { getLiveReviewContext } from "./live-review-context";
import { getRevisionMeetingDate } from "./revision-meeting";

export default async function getRevisionAvailability(
    groupId: string,
    assignmentId: string,
    occurrence: string,
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Unauthorized");
    const review = await getAssignmentReview(
        groupId,
        assignmentId,
        session.user.id,
    );
    if (!review) throw new Error("Unauthorized");
    const context = await getLiveReviewContext(
        groupId,
        session.user.id,
        occurrence,
    );
    if (!context) throw new Error("Meeting review unavailable");
    const meeting = await getGroupMeetingForUser(groupId, session.user.id);
    const next = getRevisionMeetingDate(meeting, context.startsAt);
    return {
        next: next?.toISOString() ?? null,
        timezone: meeting?.timezone ?? "UTC",
    };
}
