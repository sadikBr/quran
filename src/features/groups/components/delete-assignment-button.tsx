"use client";

import { LoaderCircle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import deleteMemberAssignment from "../server/delete-member-assignment";

export default function DeleteAssignmentButton({
    groupId,
    assignmentId,
}: {
    groupId: string;
    assignmentId: string;
}) {
    const t = useTranslations("Groups.assignments");
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    async function remove() {
        setPending(true);
        const result = await deleteMemberAssignment({ groupId, assignmentId });
        setPending(false);
        if (!result.success) {
            toast.error(t("deleteError"));
            return;
        }
        toast.success(t("deleteSuccess"));
        setIsConfirming(false);
        router.refresh();
    }

    if (!isConfirming) {
        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirming(true)}
                className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
                <Trash2 aria-hidden="true" className="size-4" />
                {t("delete")}
            </Button>
        );
    }

    return (
        <div className="flex max-w-full flex-wrap items-center gap-2 rounded-xl bg-destructive/5 p-2 ring-1 ring-destructive/15">
            <span className="min-w-48 flex-1 text-xs leading-5 text-muted-foreground">
                {t("deleteConfirm")}
            </span>
            <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={remove}
                className="rounded-lg"
            >
                {pending ? (
                    <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin"
                    />
                ) : (
                    <Trash2 aria-hidden="true" className="size-4" />
                )}
                {t(pending ? "deleting" : "confirmDelete")}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                onClick={() => setIsConfirming(false)}
                aria-label={t("cancel")}
                className="rounded-lg"
            >
                <X aria-hidden="true" className="size-4" />
            </Button>
        </div>
    );
}
