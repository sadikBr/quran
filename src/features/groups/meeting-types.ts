export interface MeetingScheduleSlot {
    weekday: number;
    localTime: string;
}

export interface GroupMeetingDetails {
    id: string;
    groupId: string;
    hostUserId: string;
    hostName: string;
    roomName: string;
    timezone: string;
    activeWindowMinutes: number;
    hostActiveUntil: Date | null;
    enabled: boolean;
    groupActive?: boolean;
    activeSince?: Date | null;
    schedule: MeetingScheduleSlot[];
    closedOccurrences?: string[];
    rescheduledOccurrences?: Array<{ from: string; to: string }>;
}

export interface MeetingOccurrenceState {
    status: "active" | "upcoming" | "disabled";
    activeStartsAt: string | null;
    activeEndsAt: string | null;
    nextStartsAt: string | null;
}
