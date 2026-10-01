export type GroupRole = "supervisor" | "member";
export type ReviewerScope = "all" | "supervisor";
export type ReviewerRole = ReviewerScope | "none";

export interface GroupSummary {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    role: GroupRole;
    isReviewer: boolean;
    reviewerScope: ReviewerScope;
    memberCount: number;
}

export interface GroupMemberDetails {
    id: string;
    userId: string;
    name: string;
    email: string;
    image: string | null;
    role: GroupRole;
    isReviewer: boolean;
    reviewerScope: ReviewerScope;
    riwayah: "hafs" | "warsh";
    joinedAt: Date;
}

export interface GroupDetails extends GroupSummary {
    inviteCode: string;
    createdById: string;
    members: GroupMemberDetails[];
}
