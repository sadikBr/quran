"use client";

import { Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import deletePracticeAssignment from "../server/delete-practice-assignment";

export default function DeletePracticeButton({
    assignmentId,
}: {
    assignmentId: string;
}) {
    const router = useRouter();
    const t = useTranslations("Practice.delete");
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    async function remove() {
        setIsDeleting(true);
        const result = await deletePracticeAssignment({ assignmentId });
        setIsDeleting(false);

        if (!result.success) {
            toast.error(t("error"));
            return;
        }

        toast.success(t("success"));
        setIsConfirming(false);
        router.refresh();
    }

    if (!isConfirming) {
        return (
            <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setIsConfirming(true)}
            >
                <Trash2 aria-hidden="true" className="size-4" />
                {t("action")}
            </Button>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-background/65 p-1.5 ring-1 ring-destructive/20">
            <span className="px-2 text-xs font-medium text-foreground">
                {t("confirm")}
            </span>
            <Button
                type="button"
                size="sm"
                variant="destructive"
                className="rounded-lg"
                disabled={isDeleting}
                onClick={remove}
            >
                <Trash2 aria-hidden="true" className="size-3.5" />
                {isDeleting ? t("deleting") : t("confirmAction")}
            </Button>
            <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="rounded-lg"
                disabled={isDeleting}
                onClick={() => setIsConfirming(false)}
                aria-label={t("cancel")}
            >
                <X aria-hidden="true" className="size-4" />
            </Button>
        </div>
    );
}
