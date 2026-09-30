"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import submitPracticeAssignment from "@/features/practice/server/submit-practice-assignment";

export default function AssignmentReadyButton({
    assignmentId,
}: {
    assignmentId: string;
}) {
    const t = useTranslations("Groups.flow");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const saving = useRef(false);
    async function submit() {
        if (saving.current) return;
        saving.current = true;
        setPending(true);
        try {
            const result = await submitPracticeAssignment({
                assignmentId,
                confirmed: true,
            });
            if (!result.success) {
                toast.error(t("error"));
                return;
            }
            setSubmitted(true);
            setOpen(false);
            toast.success(t("readySaved"));
            router.refresh();
        } catch {
            toast.error(t("error"));
        } finally {
            saving.current = false;
            setPending(false);
        }
    }
    if (submitted)
        return (
            <p aria-live="polite" className="mt-3 text-sm text-primary">
                {t("awaiting")}
            </p>
        );
    return (
        <>
            <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11 w-full rounded-xl sm:w-auto sm:ms-2"
                onClick={() => setOpen(true)}
            >
                {t("ready")}
            </Button>
            <ConfirmationDialog
                open={open}
                onOpenChange={setOpen}
                title={t("readyTitle")}
                description={t("readyDescription")}
                confirmLabel={t("confirm")}
                cancelLabel={t("cancel")}
                pending={pending}
                onConfirm={submit}
            />
        </>
    );
}
