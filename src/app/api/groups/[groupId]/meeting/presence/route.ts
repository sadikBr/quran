import { and, desc, eq, gt, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingAttendance,
    groupMeetingSession,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import { ensureMeetingAttendanceRoster } from "@/features/groups/server/meeting-attendance";
import { calculateMeetingState } from "@/features/groups/server/meeting-schedule";
import sendMeetingStartNotifications from "@/features/notifications/server/meeting-start-notifications";

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

async function recordAttendance(
    context: NonNullable<Awaited<ReturnType<typeof getContext>>>,
) {
    if (
        context.state.status !== "active" ||
        !context.state.activeStartsAt ||
        !context.state.activeEndsAt
    ) {
        return null;
    }

    const now = new Date();
    const scheduledStartsAt = new Date(context.state.activeStartsAt);
    const scheduledEndsAt = new Date(context.state.activeEndsAt);

    await ensureMeetingAttendanceRoster({
        meetingId: context.meeting.id,
        groupId: context.meeting.groupId,
        scheduledStartsAt,
        scheduledEndsAt,
    });

    return db.transaction(async (transaction) => {
        const [meetingSession] = await transaction
            .select({
                id: groupMeetingSession.id,
                startedAt: groupMeetingSession.startedAt,
                finalizedAt: groupMeetingSession.finalizedAt,
            })
            .from(groupMeetingSession)
            .where(
                and(
                    eq(groupMeetingSession.meetingId, context.meeting.id),
                    eq(
                        groupMeetingSession.scheduledStartsAt,
                        scheduledStartsAt,
                    ),
                ),
            )
            .limit(1)
            .for("update");
        if (!meetingSession || meetingSession.finalizedAt) return null;

        const [attendance] = await transaction
            .select({
                id: groupMeetingAttendance.id,
                joinedAt: groupMeetingAttendance.joinedAt,
                activeJoinedAt: groupMeetingAttendance.activeJoinedAt,
            })
            .from(groupMeetingAttendance)
            .where(
                and(
                    eq(groupMeetingAttendance.sessionId, meetingSession.id),
                    eq(groupMeetingAttendance.userId, context.userId),
                ),
            )
            .limit(1);

        if (attendance) {
            await transaction
                .update(groupMeetingAttendance)
                .set({
                    joinedAt: attendance.joinedAt ?? now,
                    activeJoinedAt: attendance.activeJoinedAt ?? now,
                    lastSeenAt: now,
                    leftAt: null,
                    status: "present",
                })
                .where(eq(groupMeetingAttendance.id, attendance.id));
        } else {
            await transaction.insert(groupMeetingAttendance).values({
                id: crypto.randomUUID(),
                sessionId: meetingSession.id,
                userId: context.userId,
                joinedAt: now,
                activeJoinedAt: now,
                lastSeenAt: now,
                status: "present",
            });
        }

        await transaction
            .update(groupMeetingSession)
            .set({
                startedAt: meetingSession.startedAt ?? now,
                endedAt: null,
            })
            .where(eq(groupMeetingSession.id, meetingSession.id));

        return meetingSession.id;
    });
}

async function closeAttendance(
    context: NonNullable<Awaited<ReturnType<typeof getContext>>>,
) {
    const [meetingSession] = await db
        .select({ id: groupMeetingSession.id })
        .from(groupMeetingSession)
        .where(eq(groupMeetingSession.meetingId, context.meeting.id))
        .orderBy(desc(groupMeetingSession.scheduledStartsAt))
        .limit(1);
    if (!meetingSession) return;

    const now = new Date();
    await db.transaction(async (transaction) => {
        const [attendance] = await transaction
            .select({
                id: groupMeetingAttendance.id,
                activeJoinedAt: groupMeetingAttendance.activeJoinedAt,
                attendedSeconds: groupMeetingAttendance.attendedSeconds,
            })
            .from(groupMeetingAttendance)
            .where(
                and(
                    eq(groupMeetingAttendance.sessionId, meetingSession.id),
                    eq(groupMeetingAttendance.userId, context.userId),
                    isNotNull(groupMeetingAttendance.activeJoinedAt),
                ),
            )
            .limit(1);
        if (!attendance?.activeJoinedAt) return;

        const segmentSeconds = Math.max(
            0,
            Math.floor(
                (now.getTime() - attendance.activeJoinedAt.getTime()) / 1_000,
            ),
        );
        await transaction
            .update(groupMeetingAttendance)
            .set({
                activeJoinedAt: null,
                lastSeenAt: now,
                leftAt: now,
                attendedSeconds: attendance.attendedSeconds + segmentSeconds,
            })
            .where(eq(groupMeetingAttendance.id, attendance.id));

        const activeCutoff = new Date(now.getTime() - HOST_PRESENCE_TTL_MS);
        const [activeAttendance] = await transaction
            .select({ id: groupMeetingAttendance.id })
            .from(groupMeetingAttendance)
            .where(
                and(
                    eq(groupMeetingAttendance.sessionId, meetingSession.id),
                    isNotNull(groupMeetingAttendance.activeJoinedAt),
                    gt(groupMeetingAttendance.lastSeenAt, activeCutoff),
                ),
            )
            .limit(1);

        if (!activeAttendance) {
            await transaction
                .update(groupMeetingSession)
                .set({ endedAt: now })
                .where(eq(groupMeetingSession.id, meetingSession.id));
        }
    });
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
    if (!context) return presenceResponse(false, 403);
    if (context.state.status !== "active") return presenceResponse(false, 410);

    const meetingSessionId = await recordAttendance(context);
    if (!meetingSessionId) return presenceResponse(false, 410);

    if (context.meeting.hostUserId === context.userId) {
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

        if (meetingSessionId) {
            after(async () => {
                await sendMeetingStartNotifications({
                    groupId: context.meeting.groupId,
                    sessionId: meetingSessionId,
                });
            });
        }
    }

    return presenceResponse(context.meeting.hostUserId === context.userId);
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ groupId: string }> },
) {
    const { groupId } = await params;
    const context = await getContext(groupId);
    if (!context) {
        return presenceResponse(false, 403);
    }

    await closeAttendance(context);

    if (context.meeting.hostUserId === context.userId) {
        await db
            .update(groupMeeting)
            .set({ hostActiveUntil: null })
            .where(
                and(
                    eq(groupMeeting.id, context.meeting.id),
                    eq(groupMeeting.hostUserId, context.userId),
                ),
            );
    }

    return presenceResponse(false);
}
