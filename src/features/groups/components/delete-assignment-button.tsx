"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
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

    async function remove() {
        if (!window.confirm(t("deleteConfirm"))) return;
        setPending(true);
        const result = await deleteMemberAssignment({ groupId, assignmentId });
        setPending(false);
        if (!result.success) {
            toast.error(t("deleteError"));
            return;
        }
        toast.success(t("deleteSuccess"));
        router.refresh();
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={remove}
            className="rounded-xl text-destructive hover:text-destructive"
        >
            {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
            ) : (
                <Trash2 className="size-4" />
            )}
            {t(pending ? "deleting" : "delete")}
        </Button>
    );
}
