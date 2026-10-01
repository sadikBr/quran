import "server-only";

import { and, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMeetingStartDelivery,
    groupMember,
    memorizationGroup,
    pushSubscription,
    userSettings,
} from "@/drizzle/schema";
import {
    configureWebPush,
    isExpiredPushSubscription,
    sendPushNotification,
} from "./web-push";

function notificationCopy(language: "ar" | "en", groupName: string) {
    if (language === "ar") {
        return {
            title: "بدأ اجتماع الحلقة الآن",
            body: `بدأ اجتماع حلقة «${groupName}». اضغط للدخول مباشرة.`,
        };
    }

    return {
        title: "Your group meeting has started",
        body: `${groupName} is meeting now. Tap to join the room.`,
    };
}

export default async function sendMeetingStartNotifications({
    groupId,
    sessionId,
}: {
    groupId: string;
    sessionId: string;
}) {
    if (!configureWebPush()) {
        return { sent: 0, duplicate: 0, removed: 0, failed: 0 };
    }

    const [group] = await db
        .select({ name: memorizationGroup.name })
        .from(memorizationGroup)
        .where(
            and(
                eq(memorizationGroup.id, groupId),
                eq(memorizationGroup.isActive, true),
            ),
        )
        .limit(1);
    if (!group) {
        return { sent: 0, duplicate: 0, removed: 0, failed: 0 };
    }

    const recipients = await db
        .select({
            subscriptionId: pushSubscription.id,
            userId: pushSubscription.userId,
            endpoint: pushSubscription.endpoint,
            p256dh: pushSubscription.p256dh,
            auth: pushSubscription.auth,
            language: userSettings.language,
            remindersEnabled: userSettings.meetingRemindersEnabled,
        })
        .from(pushSubscription)
        .innerJoin(
            groupMember,
            and(
                eq(groupMember.userId, pushSubscription.userId),
                eq(groupMember.groupId, groupId),
                eq(groupMember.role, "member"),
            ),
        )
        .leftJoin(
            userSettings,
            eq(pushSubscription.userId, userSettings.userId),
        );

    let sent = 0;
    let duplicate = 0;
    let removed = 0;
    let failed = 0;

    for (const recipient of recipients) {
        if (recipient.remindersEnabled === false) continue;

        const deliveryId = crypto.randomUUID();
        const reserved = await db
            .insert(groupMeetingStartDelivery)
            .values({
                id: deliveryId,
                sessionId,
                subscriptionId: recipient.subscriptionId,
            })
            .onConflictDoNothing()
            .returning({ id: groupMeetingStartDelivery.id });
        if (reserved.length === 0) {
            duplicate += 1;
            continue;
        }

        try {
            await sendPushNotification(
                {
                    userId: recipient.userId,
                    endpoint: recipient.endpoint,
                    keys: {
                        p256dh: recipient.p256dh,
                        auth: recipient.auth,
                    },
                },
                JSON.stringify({
                    ...notificationCopy(recipient.language ?? "en", group.name),
                    url: `/groups/${groupId}/meeting`,
                    tag: `meeting-started-${sessionId}`,
                }),
                { TTL: 3 * 60 * 60 },
            );
            await db
                .update(groupMeetingStartDelivery)
                .set({ sentAt: new Date() })
                .where(eq(groupMeetingStartDelivery.id, deliveryId));
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
                .delete(groupMeetingStartDelivery)
                .where(eq(groupMeetingStartDelivery.id, deliveryId));
            failed += 1;
        }
    }

    return { sent, duplicate, removed, failed };
}
