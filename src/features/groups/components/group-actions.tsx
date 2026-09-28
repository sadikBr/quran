"use client";

import {
    Ellipsis,
    LoaderCircle,
    LogOut,
    Shield,
    ShieldOff,
    Trash2,
    UserMinus,
    X,
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
    const [confirmingRemoval, setConfirmingRemoval] = useState(false);

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
        setPending(true);
        const result = await removeGroupMember({ groupId, membershipId });
        setPending(false);
        if (!result.success) return showFailure(result.reason, t);
        toast.success(t("updated"));
        router.refresh();
    }

    return (
        <DropdownMenu
            onOpenChange={(open) => {
                if (!open) setConfirmingRemoval(false);
            }}
        >
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
                <DropdownMenuItem
                    variant="destructive"
                    disabled={pending}
                    onSelect={(event) => {
                        if (!confirmingRemoval) {
                            event.preventDefault();
                            setConfirmingRemoval(true);
                            return;
                        }
                        remove();
                    }}
                    className={
                        confirmingRemoval
                            ? "max-w-72 whitespace-normal"
                            : undefined
                    }
                >
                    {pending ? (
                        <LoaderCircle className="animate-spin" />
                    ) : (
                        <UserMinus />
                    )}
                    {confirmingRemoval ? t("confirmRemove") : t("remove")}
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
    const [confirming, setConfirming] = useState<"leave" | "delete" | null>(
        null,
    );

    async function leave() {
        setPending(true);
        const result = await leaveGroup({ groupId });
        setPending(false);
        if (!result.success) return showFailure(result.reason, t);
        router.push("/groups");
        router.refresh();
    }

    async function removeGroup() {
        setPending(true);
        const result = await deleteGroup({ groupId });
        setPending(false);
        if (!result.success) return showFailure(undefined, t);
        router.push("/groups");
        router.refresh();
    }

    if (confirming) {
        const isDeleting = confirming === "delete";
        return (
            <div className="mt-10 rounded-2xl border border-destructive/15 bg-destructive/[0.035] p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                    {t(isDeleting ? "confirmDelete" : "confirmLeave")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={pending}
                        onClick={isDeleting ? removeGroup : leave}
                        className="rounded-xl"
                    >
                        {pending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : isDeleting ? (
                            <Trash2 className="size-4" />
                        ) : (
                            <LogOut className="size-4" />
                        )}
                        {t(isDeleting ? "delete" : "leave")}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => setConfirming(null)}
                        className="rounded-xl"
                    >
                        <X className="size-4" />
                        {t("cancel")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-border/50 pt-6">
            {canLeave && (
                <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setConfirming("leave")}
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
                    onClick={() => setConfirming("delete")}
                    className="rounded-xl"
                >
                    <Trash2 aria-hidden="true" className="size-4" />
                    {t("delete")}
                </Button>
            )}
        </div>
    );
}
