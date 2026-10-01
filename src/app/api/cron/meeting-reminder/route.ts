import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { env } from "@/data/env/server";
import db from "@/drizzle/db";
import {
    groupMeeting,
    groupMeetingReminderDelivery,
    groupMeetingSchedule,
    groupMember,
    memorizationGroup,
    pushSubscription,
    userSettings,
} from "@/drizzle/schema";
import {
    ensureMeetingAttendanceRoster,
    finalizeEndedMeetingAttendance,
} from "@/features/groups/server/meeting-attendance";
import { calculateMeetingState } from "@/features/groups/server/meeting-schedule";
import {
    configureWebPush,
    isExpiredPushSubscription,
} from "@/features/notifications/server/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_WINDOW_MINUTES = 15;

type CandidateMeeting = {
    id: string;
    groupId: string;
    groupName: string;
    hostUserId: string;
    timezone: string;
    activeWindowMinutes: number;
    enabled: boolean;
    rescheduledOccurrences: Array<{ from: string; to: string }>;
    schedule: Array<{ weekday: number; localTime: string }>;
    occurrenceStartsAt: Date;
};

function notificationCopy({
    language,
    isHost,
    groupName,
}: {
    language: "ar" | "en";
    isHost: boolean;
    groupName: string;
}) {
    if (language === "ar") {
        return isHost
            ? {
                  title: "اجتماعك يبدأ قريبًا",
                  body: `يبدأ اجتماع «${groupName}» بعد 15 دقيقة. ادخل مبكرًا لتفتح الغرفة للأعضاء.`,
              }
            : {
                  title: "اجتماع حلقتك يبدأ قريبًا",
                  body: `يبدأ اجتماع «${groupName}» بعد 15 دقيقة.`,
              };
    }

    return isHost
        ? {
              title: "Your meeting starts soon",
              body: `The ${groupName} meeting starts in 15 minutes. Join early to open the room for members.`,
          }
        : {
              title: "Your group meeting starts soon",
              body: `The ${groupName} meeting starts in 15 minutes.`,
          };
}

export async function GET(request: Request) {
    if (
        !env.CRON_SECRET ||
        request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
    ) {
        return NextResponse.json({ success: false }, { status: 401 });
    }
    const now = new Date();
    const meetingRows = await db
        .select({
            id: groupMeeting.id,
            groupId: groupMeeting.groupId,
            groupName: memorizationGroup.name,
            hostUserId: groupMeeting.hostUserId,
            timezone: groupMeeting.timezone,
            activeWindowMinutes: groupMeeting.activeWindowMinutes,
            enabled: groupMeeting.enabled,
            rescheduledOccurrences: groupMeeting.rescheduledOccurrences,
            weekday: groupMeetingSchedule.weekday,
            localTime: groupMeetingSchedule.localTime,
        })
        .from(groupMeeting)
        .innerJoin(
            memorizationGroup,
            eq(groupMeeting.groupId, memorizationGroup.id),
        )
        .innerJoin(
            groupMeetingSchedule,
            eq(groupMeeting.id, groupMeetingSchedule.meetingId),
        );

    const meetings = new Map<
        string,
        Omit<CandidateMeeting, "occurrenceStartsAt">
    >();
    for (const row of meetingRows) {
        if (!row.hostUserId || !row.enabled) continue;
        const meeting = meetings.get(row.id) ?? {
            id: row.id,
            groupId: row.groupId,
            groupName: row.groupName,
            hostUserId: row.hostUserId,
            timezone: row.timezone,
            activeWindowMinutes: row.activeWindowMinutes,
            enabled: row.enabled,
            rescheduledOccurrences: row.rescheduledOccurrences,
            schedule: [],
        };
        meeting.schedule.push({
            weekday: row.weekday,
            localTime: row.localTime,
        });
        meetings.set(row.id, meeting);
    }

    const candidates: CandidateMeeting[] = [];
    let attendancePrepared = 0;
    for (const meeting of meetings.values()) {
        const state = calculateMeetingState({ ...meeting, now });
        if (
            state.status === "active" &&
            state.activeStartsAt &&
            state.activeEndsAt
        ) {
            await ensureMeetingAttendanceRoster({
                meetingId: meeting.id,
                groupId: meeting.groupId,
                scheduledStartsAt: new Date(state.activeStartsAt),
                scheduledEndsAt: new Date(state.activeEndsAt),
            });
            attendancePrepared += 1;
        }
        if (!state.nextStartsAt) continue;

        const occurrenceStartsAt = new Date(state.nextStartsAt);
        const minutesUntil =
            (occurrenceStartsAt.getTime() - now.getTime()) / 60_000;
        if (minutesUntil <= 0 || minutesUntil > REMINDER_WINDOW_MINUTES) {
            continue;
        }

        candidates.push({ ...meeting, occurrenceStartsAt });
    }
    const attendanceFinalized = await finalizeEndedMeetingAttendance(now);

    if (candidates.length === 0) {
        return NextResponse.json({
            success: true,
            sent: 0,
            duplicate: 0,
            attendancePrepared,
            attendanceFinalized,
        });
    }

    if (!configureWebPush()) {
        return NextResponse.json(
            {
                success: false,
                reason: "Push is not configured.",
                attendancePrepared,
                attendanceFinalized,
            },
            { status: 503 },
        );
    }

    const candidateByGroup = new Map(
        candidates.map((meeting) => [meeting.groupId, meeting]),
    );
    const recipients = await db
        .select({
            groupId: groupMember.groupId,
            userId: groupMember.userId,
            subscriptionId: pushSubscription.id,
            endpoint: pushSubscription.endpoint,
            p256dh: pushSubscription.p256dh,
            auth: pushSubscription.auth,
            language: userSettings.language,
            remindersEnabled: userSettings.meetingRemindersEnabled,
        })
        .from(groupMember)
        .innerJoin(
            pushSubscription,
            eq(groupMember.userId, pushSubscription.userId),
        )
        .leftJoin(userSettings, eq(groupMember.userId, userSettings.userId))
        .where(inArray(groupMember.groupId, [...candidateByGroup.keys()]));

    let sent = 0;
    let duplicate = 0;
    let removed = 0;
    let failed = 0;

    for (const recipient of recipients) {
        if (recipient.remindersEnabled === false) continue;
        const meeting = candidateByGroup.get(recipient.groupId);
        if (!meeting) continue;

        const deliveryId = crypto.randomUUID();
        const reserved = await db
            .insert(groupMeetingReminderDelivery)
            .values({
                id: deliveryId,
                meetingId: meeting.id,
                subscriptionId: recipient.subscriptionId,
                occurrenceStartsAt: meeting.occurrenceStartsAt,
            })
            .onConflictDoNothing()
            .returning({ id: groupMeetingReminderDelivery.id });

        if (reserved.length === 0) {
            duplicate += 1;
            continue;
        }

        const copy = notificationCopy({
            language: recipient.language ?? "en",
            isHost: recipient.userId === meeting.hostUserId,
            groupName: meeting.groupName,
        });

        try {
            await webpush.sendNotification(
                {
                    endpoint: recipient.endpoint,
                    keys: {
                        p256dh: recipient.p256dh,
                        auth: recipient.auth,
                    },
                },
                JSON.stringify({
                    ...copy,
                    url: `/groups/${meeting.groupId}`,
                    tag: `group-meeting-${meeting.id}-${meeting.occurrenceStartsAt.getTime()}`,
                }),
                { TTL: 20 * 60, urgency: "high" },
            );
            await db
                .update(groupMeetingReminderDelivery)
                .set({ sentAt: new Date() })
                .where(eq(groupMeetingReminderDelivery.id, deliveryId));
            sent += 1;
        } catch (error) {
            if (isExpiredPushSubscription(error)) {
                await db
                    .delete(pushSubscription)
                    .where(eq(pushSubscription.id, recipient.subscriptionId));
                removed += 1;
                continue;
            }

            await db
                .delete(groupMeetingReminderDelivery)
                .where(eq(groupMeetingReminderDelivery.id, deliveryId));
            failed += 1;
        }
    }

    return NextResponse.json({
        success: true,
        meetings: candidates.length,
        sent,
        duplicate,
        removed,
        failed,
        attendancePrepared,
        attendanceFinalized,
    });
}
