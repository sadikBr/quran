import {
    date,
    pgTable,
    primaryKey,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { pushSubscription } from "./push-subscription";

export const adhkarReminderDelivery = pgTable(
    "adhkar_reminder_delivery",
    {
        subscriptionId: text("subscription_id")
            .notNull()
            .references(() => pushSubscription.id, { onDelete: "cascade" }),
        kind: text("kind").notNull(),
        localDate: date("local_date", { mode: "string" }).notNull(),
        claimedAt: timestamp("claimed_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        sentAt: timestamp("sent_at", { withTimezone: true }),
    },
    (table) => [
        primaryKey({
            columns: [table.subscriptionId, table.kind, table.localDate],
        }),
    ],
);
