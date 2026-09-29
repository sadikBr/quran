import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import db from "@/drizzle/db";
import { groupMeeting } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import { calculateMeetingState } from "@/features/groups/server/meeting-schedule";

const HOST_PRESENCE_TTL_MS = 75_000;

async function getContext(groupId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const meeting = await getGroupMeetingForUser(groupId, session.user.id);
    if (!meeting) return null;

    return {
        meeting,
        userId: session.user.id,
        state: calculateMeetingState(meeting),
    };
}

function presenceResponse(hostPresent: boolean, status = 200) {
    return NextResponse.json(
        { hostPresent },
        {
            status,
            headers: { "Cache-Control": "no-store" },
        },
    );
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ groupId: string }> },
) {
    const { groupId } = await params;
    const context = await getContext(groupId);
    if (!context) return presenceResponse(false, 401);

    const hostPresent =
        context.state.status === "active" &&
        Boolean(
            context.meeting.hostActiveUntil &&
                context.meeting.hostActiveUntil.getTime() > Date.now(),
        );

    return presenceResponse(hostPresent);
}

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ groupId: string }> },
) {
    const { groupId } = await params;
    const context = await getContext(groupId);
    if (
        !context ||
        context.state.status !== "active" ||
        context.meeting.hostUserId !== context.userId
    ) {
        return presenceResponse(false, 403);
    }

    const hostActiveUntil = new Date(Date.now() + HOST_PRESENCE_TTL_MS);
    await db
        .update(groupMeeting)
        .set({ hostActiveUntil })
        .where(
            and(
                eq(groupMeeting.id, context.meeting.id),
                eq(groupMeeting.hostUserId, context.userId),
            ),
        );

    return presenceResponse(true);
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ groupId: string }> },
) {
    const { groupId } = await params;
    const context = await getContext(groupId);
    if (!context || context.meeting.hostUserId !== context.userId) {
        return presenceResponse(false, 403);
    }

    await db
        .update(groupMeeting)
        .set({ hostActiveUntil: null })
        .where(
            and(
                eq(groupMeeting.id, context.meeting.id),
                eq(groupMeeting.hostUserId, context.userId),
            ),
        );

    return presenceResponse(false);
}
