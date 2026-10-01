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
import { session, user } from "./auth-schema";
import { groupMeeting, groupMeetingSession } from "./memorization-group";
import { practiceAssignment } from "./practice-assignment";

export const pushSubscription = pgTable(
    "push_subscription",
    {
        id,
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        // Legacy subscriptions stay unbound until the device opts in again.
        sessionId: text("session_id").references(() => session.id, {
            onDelete: "cascade",
        }),
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
        index("push_subscription_session_idx").on(table.sessionId),
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
        meetingStartDeliveries: many(groupMeetingStartDelivery),
        assignmentNotificationDeliveries: many(assignmentNotificationDelivery),
    }),
);

export const groupMeetingStartDelivery = pgTable(
    "group_meeting_start_delivery",
    {
        id,
        sessionId: text("session_id")
            .notNull()
            .references(() => groupMeetingSession.id, { onDelete: "cascade" }),
        subscriptionId: text("subscription_id")
            .notNull()
            .references(() => pushSubscription.id, { onDelete: "cascade" }),
        sentAt: timestamp("sent_at", { withTimezone: true }),
        createdAt,
    },
    (table) => [
        uniqueIndex("group_meeting_start_delivery_once_idx").on(
            table.sessionId,
            table.subscriptionId,
        ),
        index("group_meeting_start_delivery_session_idx").on(table.sessionId),
        index("group_meeting_start_delivery_subscription_idx").on(
            table.subscriptionId,
        ),
    ],
);

export const groupMeetingStartDeliveryRelations = relations(
    groupMeetingStartDelivery,
    ({ one }) => ({
        session: one(groupMeetingSession, {
            fields: [groupMeetingStartDelivery.sessionId],
            references: [groupMeetingSession.id],
        }),
        subscription: one(pushSubscription, {
            fields: [groupMeetingStartDelivery.subscriptionId],
            references: [pushSubscription.id],
        }),
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

export const assignmentNotificationDelivery = pgTable(
    "assignment_notification_delivery",
    {
        id,
        assignmentId: text("assignment_id")
            .notNull()
            .references(() => practiceAssignment.id, { onDelete: "cascade" }),
        subscriptionId: text("subscription_id")
            .notNull()
            .references(() => pushSubscription.id, { onDelete: "cascade" }),
        kind: text("kind").notNull(),
        sentAt: timestamp("sent_at", { withTimezone: true }),
        createdAt,
    },
    (table) => [
        uniqueIndex("assignment_notification_delivery_once_idx").on(
            table.assignmentId,
            table.subscriptionId,
            table.kind,
        ),
        index("assignment_notification_delivery_assignment_idx").on(
            table.assignmentId,
        ),
        index("assignment_notification_delivery_subscription_idx").on(
            table.subscriptionId,
        ),
    ],
);

export const assignmentNotificationDeliveryRelations = relations(
    assignmentNotificationDelivery,
    ({ one }) => ({
        assignment: one(practiceAssignment, {
            fields: [assignmentNotificationDelivery.assignmentId],
            references: [practiceAssignment.id],
        }),
        subscription: one(pushSubscription, {
            fields: [assignmentNotificationDelivery.subscriptionId],
            references: [pushSubscription.id],
        }),
    }),
);
