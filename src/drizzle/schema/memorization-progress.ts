import { relations, sql } from "drizzle-orm";
import {
    check,
    integer,
    pgTable,
    primaryKey,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { createdAt } from "../helpers";
import { user } from "./auth-schema";

export const userMemorizedHizb = pgTable(
    "user_memorized_hizb",
    {
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        hizbNumber: integer("hizb_number").notNull(),
        completedAt: timestamp("completed_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        createdAt,
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.hizbNumber] }),
        check(
            "user_memorized_hizb_number_range",
            sql`${table.hizbNumber} between 1 and 60`,
        ),
    ],
);

export const userMemorizedHizbRelations = relations(
    userMemorizedHizb,
    ({ one }) => ({
        user: one(user, {
            fields: [userMemorizedHizb.userId],
            references: [user.id],
        }),
    }),
);
