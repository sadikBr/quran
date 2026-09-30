"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import endGroupMeeting from "../server/end-group-meeting";

export default function CancelMeetingButton({
    groupId,
    occurrence,
}: {
    groupId: string;
    occurrence: string;
}) {
    const t = useTranslations("Groups.meeting.room");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const saving = useRef(false);
    return (
        <>
            <Button
                variant="outline"
                size="lg"
                className="min-h-11 w-full rounded-xl text-destructive hover:text-destructive lg:w-auto"
                disabled={pending}
                onClick={() => setOpen(true)}
            >
                {t("cancelMeeting")}
            </Button>
            <ConfirmationDialog
                open={open}
                onOpenChange={setOpen}
                title={t("cancelMeeting")}
                description={t("cancelMeetingConfirm")}
                confirmLabel={t(pending ? "ending" : "cancelMeeting")}
                cancelLabel={t("cancelEnd")}
                pending={pending}
                destructive
                onConfirm={async () => {
                    if (saving.current) return;
                    saving.current = true;
                    setPending(true);
                    try {
                        const result = await endGroupMeeting(
                            groupId,
                            occurrence,
                            "cancel",
                        );
                        if (!result.success) {
                            toast.error(
                                t(
                                    result.reason === "no_next_meeting"
                                        ? "cancelNoNext"
                                        : "endError",
                                ),
                            );
                            return;
                        }
                        setOpen(false);
                        router.refresh();
                    } catch {
                        toast.error(t("endError"));
                    } finally {
                        saving.current = false;
                        setPending(false);
                    }
                }}
            />
        </>
    );
}
