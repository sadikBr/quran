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
    schedule: MeetingScheduleSlot[];
}

export interface MeetingOccurrenceState {
    status: "active" | "upcoming" | "disabled";
    activeStartsAt: string | null;
    activeEndsAt: string | null;
    nextStartsAt: string | null;
}
