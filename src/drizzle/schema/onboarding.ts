import { boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const userGuideProgress = pgTable(
    "user_guide_progress",
    {
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        guideId: text("guide_id").notNull(),
        completed: boolean("completed").notNull().default(false),
    },
    (table) => [primaryKey({ columns: [table.userId, table.guideId] })],
);
