"use client";

import { Ellipsis, LogOut, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    leaveGroup,
    removeGroupMember,
    setGroupReviewer,
} from "../server/manage-group";
import type { GroupRole, ReviewerRole, ReviewerScope } from "../types";

export function MemberActions({
    groupId,
    membershipId,
    memberName,
    role,
    isReviewer,
    reviewerScope,
}: {
    groupId: string;
    membershipId: string;
    memberName: string;
    role: GroupRole;
    isReviewer: boolean;
    reviewerScope: ReviewerScope;
}) {
    const t = useTranslations("Groups.detail");
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [confirming, setConfirming] = useState(false);
    if (role === "supervisor") return null;
    async function changeReviewer(reviewerRole: ReviewerRole) {
        setPending(true);
        try {
            const result = await setGroupReviewer({
                groupId,
                membershipId,
                reviewerRole,
            });
            if (!result.success) {
                toast.error(t("failed"));
                return;
            }
            toast.success(t("updated"));
            router.refresh();
        } catch {
            toast.error(t("failed"));
        } finally {
            setPending(false);
        }
    }
    async function remove() {
        setPending(true);
        try {
            const result = await removeGroupMember({ groupId, membershipId });
            if (!result.success) {
                toast.error(t("failed"));
                return;
            }
            toast.success(t("updated"));
            router.refresh();
        } catch {
            toast.error(t("failed"));
        } finally {
            setPending(false);
        }
    }
    return (
        <DropdownMenu onOpenChange={() => setConfirming(false)}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={t("actionsFor", { name: memberName })}
                >
                    <Ellipsis />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("reviewRole")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={isReviewer ? reviewerScope : "none"}
                    onValueChange={(value) => {
                        if (
                            value === "none" ||
                            value === "all" ||
                            value === "supervisor"
                        )
                            void changeReviewer(value);
                    }}
                >
                    <DropdownMenuRadioItem value="none" disabled={pending}>
                        {t("noReviewRole")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                        value="supervisor"
                        disabled={pending}
                    >
                        {t("supervisorReviewer")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="all" disabled={pending}>
                        {t("reviewer")}
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    disabled={pending}
                    onSelect={(event) => {
                        if (!confirming) {
                            event.preventDefault();
                            setConfirming(true);
                        } else {
                            void remove();
                        }
                    }}
                >
                    <UserMinus />
                    {t(confirming ? "confirmRemove" : "remove")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function GroupDangerActions({
    groupId,
    canLeave,
}: {
    groupId: string;
    isAdmin?: boolean;
    canLeave: boolean;
}) {
    const t = useTranslations("Groups.detail");
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [confirming, setConfirming] = useState(false);
    if (!canLeave) return null;
    async function leave() {
        setPending(true);
        try {
            const result = await leaveGroup({ groupId });
            if (!result.success) {
                toast.error(t("meetingHost"));
                return;
            }
            router.push("/groups");
            router.refresh();
        } catch {
            toast.error(t("failed"));
        } finally {
            setPending(false);
        }
    }
    return (
        <div className="mt-10 border-t border-border/50 pt-6">
            {confirming && (
                <p className="mb-3 text-sm text-muted-foreground">
                    {t("confirmLeave")}
                </p>
            )}
            <div className="flex gap-2">
                <Button
                    variant={confirming ? "destructive" : "outline"}
                    disabled={pending}
                    onClick={() =>
                        confirming ? void leave() : setConfirming(true)
                    }
                >
                    <LogOut className="size-4" />
                    {t("leave")}
                </Button>
                {confirming && (
                    <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={() => setConfirming(false)}
                    >
                        {t("cancel")}
                    </Button>
                )}
            </div>
        </div>
    );
}
