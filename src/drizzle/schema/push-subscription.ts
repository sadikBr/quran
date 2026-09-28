import { relations } from "drizzle-orm";
import { date, index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../helpers";
import { user } from "./auth-schema";

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
    ({ one }) => ({
        user: one(user, {
            fields: [pushSubscription.userId],
            references: [user.id],
        }),
    }),
);
