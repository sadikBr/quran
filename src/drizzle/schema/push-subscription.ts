import { relations } from "drizzle-orm";
import {
    date,
    index,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../helpers";
import { user } from "./auth-schema";
import { groupMeeting } from "./memorization-group";

export const pushSubscription = pgTable(
    "push_subscription",
    {
        id,
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        endpoint: text("endpoint").notNull(),
        p256dh: text("p256dh").notNull(),
        auth: text("auth").notNull(),
        userAgent: text("user_agent"),
        lastWirdReminderDate: date("last_wird_reminder_date", {
            mode: "string",
        }),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("push_subscription_endpoint_idx").on(table.endpoint),
        index("push_subscription_user_idx").on(table.userId),
    ],
);

export const pushSubscriptionRelations = relations(
    pushSubscription,
    ({ one, many }) => ({
        user: one(user, {
            fields: [pushSubscription.userId],
            references: [user.id],
        }),
        meetingReminderDeliveries: many(groupMeetingReminderDelivery),
    }),
);

export const groupMeetingReminderDelivery = pgTable(
    "group_meeting_reminder_delivery",
    {
        id,
        meetingId: text("meeting_id")
            .notNull()
            .references(() => groupMeeting.id, { onDelete: "cascade" }),
        subscriptionId: text("subscription_id")
            .notNull()
            .references(() => pushSubscription.id, { onDelete: "cascade" }),
        occurrenceStartsAt: timestamp("occurrence_starts_at", {
            withTimezone: true,
        }).notNull(),
        sentAt: timestamp("sent_at", { withTimezone: true }),
        createdAt,
    },
    (table) => [
        uniqueIndex("group_meeting_reminder_delivery_once_idx").on(
            table.meetingId,
            table.subscriptionId,
            table.occurrenceStartsAt,
        ),
        index("group_meeting_reminder_delivery_meeting_idx").on(
            table.meetingId,
        ),
        index("group_meeting_reminder_delivery_subscription_idx").on(
            table.subscriptionId,
        ),
    ],
);

export const groupMeetingReminderDeliveryRelations = relations(
    groupMeetingReminderDelivery,
    ({ one }) => ({
        meeting: one(groupMeeting, {
            fields: [groupMeetingReminderDelivery.meetingId],
            references: [groupMeeting.id],
        }),
        subscription: one(pushSubscription, {
            fields: [groupMeetingReminderDelivery.subscriptionId],
            references: [pushSubscription.id],
        }),
    }),
);
