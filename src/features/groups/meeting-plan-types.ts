import type { PracticeKind, QuranReference } from "@/features/practice/types";
import type { Riwayah } from "@/features/settings/preferences";

export interface MeetingPlanAssignment {
    assigneeId: string;
    kind: PracticeKind;
    riwayah: Riwayah;
    start: QuranReference;
    end: QuranReference;
    instructions: string;
}

export interface MeetingPlannerData {
    published: Array<
        MeetingPlanAssignment & {
            id: string;
            status: string;
            dueAt: string | null;
        }
    >;
    drafts: Array<
        MeetingPlanAssignment & {
            dueMeetingStartsAt: string;
        }
    >;
    previousMeetingStartsAt: string | null;
    previousAssignments: MeetingPlanAssignment[];
}
