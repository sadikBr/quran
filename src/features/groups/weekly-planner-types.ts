import type { PracticeKind, QuranReference } from "@/features/practice/types";
import type { Riwayah } from "@/features/settings/preferences";

export interface WeeklyPlanAssignment {
    assigneeId: string;
    kind: PracticeKind;
    riwayah: Riwayah;
    start: QuranReference;
    end: QuranReference;
    instructions: string;
}

export interface WeeklyPlannerData {
    dueDate: string | null;
    drafts: WeeklyPlanAssignment[];
    previousDueDate: string | null;
    previousAssignments: WeeklyPlanAssignment[];
}
