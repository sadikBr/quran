import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Keep snapshots after a circle has been deleted.
export const adminActivity = pgTable(
    "admin_activity",
    {
        id: text("id").primaryKey(),
        actorId: text("actor_id")
            .notNull()
            .references(() => user.id, { onDelete: "restrict" }),
        action: text("action", {
            enum: [
                "circle_created",
                "supervisor_changed",
                "circle_deleted",
                "circle_updated",
                "circle_activated",
                "circle_deactivated",
            ],
        }).notNull(),
        groupId: text("group_id").notNull(),
        groupName: text("group_name").notNull(),
        details: jsonb("details")
            .$type<{ previousSupervisorId?: string; supervisorId?: string }>()
            .notNull()
            .default({}),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [index("admin_activity_date_idx").on(table.createdAt)],
);
