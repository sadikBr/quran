export type GroupRole = "admin" | "member";

export interface GroupSummary {
    id: string;
    name: string;
    description: string | null;
    role: GroupRole;
    memberCount: number;
}

export interface GroupMemberDetails {
    id: string;
    userId: string;
    name: string;
    email: string;
    image: string | null;
    role: GroupRole;
    riwayah: "hafs" | "warsh";
    joinedAt: Date;
}

export interface GroupDetails extends GroupSummary {
    inviteCode: string;
    createdById: string;
    members: GroupMemberDetails[];
}
