import { pgEnum } from "drizzle-orm/pg-core";

export const ROLES = ["User", "Admin"] as const;
export const Role = pgEnum("role", ROLES);

export const PROGRESS_STATUSES = [
    "NotStarted",
    "Learning",
    "Memorized",
    "Reviewing",
] as const;
export const ProgressStatus = pgEnum("progress_status", PROGRESS_STATUSES);

export const TASK_STATUSES = [
    "Pending",
    "InProgress",
    "Completed",
    "Overdue",
] as const;
export const TaskStatus = pgEnum("task_status", TASK_STATUSES);
