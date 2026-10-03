import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const userAdminActivity = pgTable(
    "user_admin_activity",
    {
        id: text("id").primaryKey(),
        actorId: text("actor_id")
            .notNull()
            .references(() => user.id, { onDelete: "restrict" }),
        targetId: text("target_id").references(() => user.id, {
            onDelete: "set null",
        }),
        targetName: text("target_name").notNull(),
        action: text("action", {
            enum: ["reset", "suspend", "reactivate", "sign_out"],
        }).notNull(),
        reason: text("reason").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("user_admin_activity_target_idx").on(
            table.targetId,
            table.createdAt,
        ),
        index("user_admin_activity_date_idx").on(table.createdAt),
        check(
            "user_admin_activity_action_check",
            sql`${table.action} in ('reset', 'suspend', 'reactivate', 'sign_out')`,
        ),
    ],
);
