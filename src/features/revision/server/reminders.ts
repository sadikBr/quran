import "server-only";
import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    pushSubscription,
    revisionPlan,
    revisionReminderDelivery,
    user,
    userSettings,
} from "@/drizzle/schema";
import {
    isExpiredPushSubscription,
    sendPushNotification,
} from "@/features/notifications/server/web-push";
import { dueRevisionDate } from "../schedule";
import { getRevisionReminderDate, getRevisionView } from "./service";

export async function sendRevisionReminders(now = new Date()) {
    const rows = await db
        .select({
            subscription: pushSubscription,
            plan: revisionPlan,
            language: userSettings.language,
        })
        .from(pushSubscription)
        .innerJoin(
            revisionPlan,
            eq(revisionPlan.userId, pushSubscription.userId),
        )
        .innerJoin(
            userSettings,
            eq(userSettings.userId, pushSubscription.userId),
        )
        .innerJoin(user, eq(user.id, pushSubscription.userId))
        .where(
            and(
                eq(user.role, "member"),
                eq(revisionPlan.enabled, true),
                isNotNull(revisionPlan.reminderTime),
            ),
        );
    const views = new Map<
        string,
        Awaited<ReturnType<typeof getRevisionView>>
    >();
    const dueUsers = new Map<string, boolean>();
    let sent = 0,
        failed = 0;
    for (const { subscription, plan, language } of rows) {
        try {
            // Avoid rebuilding memorization coverage for every device on every cron tick.
            if (!dueUsers.has(plan.userId)) {
                dueUsers.set(
                    plan.userId,
                    Boolean(
                        plan.reminderTime &&
                            (await getRevisionReminderDate(
                                plan.userId,
                                plan.timezone,
                                plan.reminderTime,
                                now,
                            )),
                    ),
                );
            }
            if (!dueUsers.get(plan.userId)) continue;
            let view = views.get(plan.userId);
            if (!view) {
                view = await getRevisionView(plan.userId);
                views.set(plan.userId, view);
            }
            if (!view.plan?.enabled || !view.plan.reminderTime || !view.week)
                continue;
            const date = dueRevisionDate(
                view.plan.reminderTime,
                view.week.timezone,
                now,
            );
            if (
                !date ||
                !view.sessions.some(
                    (s) => s.scheduledDate === date && s.available && !s.done,
                )
            )
                continue;
            const key = and(
                eq(revisionReminderDelivery.subscriptionId, subscription.id),
                eq(revisionReminderDelivery.localDate, date),
            );
            const claim = await db
                .insert(revisionReminderDelivery)
                .values({
                    subscriptionId: subscription.id,
                    localDate: date,
                    claimedAt: now,
                })
                .onConflictDoUpdate({
                    target: [
                        revisionReminderDelivery.subscriptionId,
                        revisionReminderDelivery.localDate,
                    ],
                    set: { claimedAt: now },
                    setWhere: and(
                        isNull(revisionReminderDelivery.sentAt),
                        lt(
                            revisionReminderDelivery.claimedAt,
                            new Date(+now - 5 * 60_000),
                        ),
                    ),
                })
                .returning();
            if (!claim.length) continue;
            try {
                const [active] = await db
                    .select()
                    .from(revisionPlan)
                    .where(
                        and(
                            eq(revisionPlan.userId, plan.userId),
                            eq(revisionPlan.enabled, true),
                            eq(revisionPlan.revision, view.plan.revision),
                            isNotNull(revisionPlan.reminderTime),
                        ),
                    );
                if (!active) {
                    await db
                        .delete(revisionReminderDelivery)
                        .where(
                            and(key, isNull(revisionReminderDelivery.sentAt)),
                        );
                    continue;
                }
                const ar = language === "ar";
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
                        title: ar
                            ? "حان وقت مراجعة محفوظك"
                            : "Time to revise your memorization",
                        body: ar
                            ? "جلسة مراجعة اليوم بانتظارك. افتح خطتك للمتابعة."
                            : "Your revision session for today is ready. Open your plan to continue.",
                        url: "/memorization/revision",
                        tag: `revision-${date}`,
                    }),
                    { TTL: 30 * 60, urgency: "normal", timeout: 10000 },
                );
                await db
                    .update(revisionReminderDelivery)
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
                else
                    await db
                        .delete(revisionReminderDelivery)
                        .where(
                            and(
                                key,
                                isNull(revisionReminderDelivery.sentAt),
                                eq(revisionReminderDelivery.claimedAt, now),
                            ),
                        );
            }
        } catch {
            failed++;
        }
    }
    return { sent, failed };
}
