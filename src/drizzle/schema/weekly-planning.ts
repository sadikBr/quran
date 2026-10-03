import {
    date,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const weeklyPlanning = pgTable(
    "weekly_planning",
    {
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        weekStart: date("week_start", { mode: "string" }).notNull(),
        capacities: jsonb("capacities").$type<number[]>().notNull(),
        estimates: jsonb("estimates").$type<Record<string, number>>().notNull(),
        revision: integer("revision").notNull().default(1),
    },
    (table) => [primaryKey({ columns: [table.userId, table.weekStart] })],
);
