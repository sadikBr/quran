"use client";

import {
    Ellipsis,
    LogOut,
    Shield,
    ShieldOff,
    Trash2,
    UserMinus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    deleteGroup,
    leaveGroup,
    removeGroupMember,
    updateMemberRole,
} from "../server/manage-group";
import type { GroupRole } from "../types";

function showFailure(
    reason: string | undefined,
    t: ReturnType<typeof useTranslations>,
) {
    toast.error(t(reason === "last_admin" ? "lastAdmin" : "failed"));
}

export function MemberActions({
    groupId,
    membershipId,
    role,
}: {
    groupId: string;
    membershipId: string;
    role: GroupRole;
}) {
    const t = useTranslations("Groups.detail");
    const router = useRouter();
    const [pending, setPending] = useState(false);

    async function changeRole() {
        setPending(true);
        const result = await updateMemberRole({
            groupId,
            membershipId,
            role: role === "admin" ? "member" : "admin",
        });
        setPending(false);
        if (!result.success) return showFailure(result.reason, t);
        toast.success(t("updated"));
        router.refresh();
    }

    async function remove() {
        if (!window.confirm(t("confirmRemove"))) return;
        setPending(true);
        const result = await removeGroupMember({ groupId, membershipId });
        setPending(false);
        if (!result.success) return showFailure(result.reason, t);
        toast.success(t("updated"));
        router.refresh();
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={t("actions")}
                    className="rounded-full"
                >
                    <Ellipsis aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={changeRole}>
                    {role === "admin" ? <ShieldOff /> : <Shield />}
                    {t(role === "admin" ? "makeMember" : "makeAdmin")}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={remove}>
                    <UserMinus />
                    {t("remove")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function GroupDangerActions({
    groupId,
    isAdmin,
    canLeave,
}: {
    groupId: string;
    isAdmin: boolean;
    canLeave: boolean;
}) {
    const t = useTranslations("Groups.detail");
    const router = useRouter();
    const [pending, setPending] = useState(false);

    async function leave() {
        if (!window.confirm(t("confirmLeave"))) return;
        setPending(true);
        const result = await leaveGroup({ groupId });
        setPending(false);
        if (!result.success) return showFailure(result.reason, t);
        router.push("/groups");
        router.refresh();
    }

    async function removeGroup() {
        if (!window.confirm(t("confirmDelete"))) return;
        setPending(true);
        const result = await deleteGroup({ groupId });
        setPending(false);
        if (!result.success) return showFailure(undefined, t);
        router.push("/groups");
        router.refresh();
    }

    return (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-border/50 pt-6">
            {canLeave && (
                <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={leave}
                    className="rounded-xl"
                >
                    <LogOut aria-hidden="true" className="size-4" />
                    {t("leave")}
                </Button>
            )}
            {isAdmin && (
                <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    onClick={removeGroup}
                    className="rounded-xl"
                >
                    <Trash2 aria-hidden="true" className="size-4" />
                    {t("delete")}
                </Button>
            )}
        </div>
    );
}
