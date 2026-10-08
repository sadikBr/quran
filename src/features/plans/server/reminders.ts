import "server-only";
import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    pushSubscription,
    recurringOccurrence,
    recurringPlan,
    recurringReminderDelivery,
    user,
    userSettings,
} from "@/drizzle/schema";
import {
    isExpiredPushSubscription,
    sendPushNotification,
} from "@/features/notifications/server/web-push";
import { recurringReminderDate } from "../recurrence";

export async function sendRecurringReminders(now = new Date()) {
    const rows = await db
        .select({
            subscription: pushSubscription,
            plan: recurringPlan,
            language: userSettings.language,
        })
        .from(recurringPlan)
        .innerJoin(
            pushSubscription,
            eq(pushSubscription.userId, recurringPlan.userId),
        )
        .innerJoin(user, eq(user.id, recurringPlan.userId))
        .leftJoin(userSettings, eq(userSettings.userId, recurringPlan.userId))
        .where(
            and(
                eq(user.role, "member"),
                isNull(user.suspendedAt),
                eq(recurringPlan.enabled, true),
                eq(recurringPlan.archived, false),
                isNotNull(recurringPlan.reminderTime),
            ),
        );
    let sent = 0,
        failed = 0;
    for (const { subscription, plan, language } of rows) {
        const date = recurringReminderDate(plan, now);
        if (!date) continue;
        const key = and(
            eq(recurringReminderDelivery.planId, plan.id),
            eq(recurringReminderDelivery.subscriptionId, subscription.id),
            eq(recurringReminderDelivery.localDate, date),
        );
        try {
            const [occurrence] = await db
                .select()
                .from(recurringOccurrence)
                .where(
                    and(
                        eq(recurringOccurrence.planId, plan.id),
                        eq(recurringOccurrence.localDate, date),
                    ),
                );
            if (occurrence) continue;
            const claim = await db
                .insert(recurringReminderDelivery)
                .values({
                    planId: plan.id,
                    subscriptionId: subscription.id,
                    localDate: date,
                    claimedAt: now,
                })
                .onConflictDoUpdate({
                    target: [
                        recurringReminderDelivery.planId,
                        recurringReminderDelivery.subscriptionId,
                        recurringReminderDelivery.localDate,
                    ],
                    set: { claimedAt: now },
                    setWhere: and(
                        isNull(recurringReminderDelivery.sentAt),
                        lt(
                            recurringReminderDelivery.claimedAt,
                            new Date(+now - 5 * 60_000),
                        ),
                    ),
                })
                .returning();
            if (!claim.length) continue;
            const release = () =>
                db
                    .delete(recurringReminderDelivery)
                    .where(
                        and(
                            key,
                            isNull(recurringReminderDelivery.sentAt),
                            eq(recurringReminderDelivery.claimedAt, now),
                        ),
                    );
            try {
                const [active] = await db
                    .select()
                    .from(recurringPlan)
                    .where(
                        and(
                            eq(recurringPlan.id, plan.id),
                            eq(recurringPlan.revision, plan.revision),
                            eq(recurringPlan.enabled, true),
                            eq(recurringPlan.archived, false),
                        ),
                    );
                const [finished] = await db
                    .select()
                    .from(recurringOccurrence)
                    .where(
                        and(
                            eq(recurringOccurrence.planId, plan.id),
                            eq(recurringOccurrence.localDate, date),
                        ),
                    );
                if (!active || finished) {
                    await release();
                    continue;
                }
                await sendPushNotification(
                    {
                        userId: subscription.userId,
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth,
                        },
                    },
                    JSON.stringify({
                        title:
                            language === "ar"
                                ? "حان وقت نشاطك"
                                : "Time for your routine",
                        body: plan.title,
                        url: "/plans/today",
                        tag: `recurring-${plan.id}-${date}`,
                    }),
                    { TTL: 30 * 60, urgency: "normal", timeout: 10000 },
                );
                await db
                    .update(recurringReminderDelivery)
                    .set({ sentAt: now })
                    .where(key);
                sent++;
            } catch (error) {
                failed++;
                if (isExpiredPushSubscription(error))
                    await db
                        .delete(pushSubscription)
                        .where(
                            and(
                                eq(pushSubscription.id, subscription.id),
                                eq(pushSubscription.userId, plan.userId),
                            ),
                        );
                else await release();
            }
        } catch {
            failed++;
        }
    }
    return { sent, failed };
}
