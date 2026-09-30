"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import changeMeetingHost from "../server/change-meeting-host";

export default function MeetingHostControl({
    groupId,
    hostUserId,
    supervisors,
}: {
    groupId: string;
    hostUserId: string;
    supervisors: { id: string; name: string }[];
}) {
    const t = useTranslations("Groups.flow");
    const router = useRouter();
    const [selected, setSelected] = useState(hostUserId);
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const saving = useRef(false);
    if (supervisors.length < 2) return null;
    async function save() {
        if (saving.current) return;
        saving.current = true;
        setPending(true);
        try {
            const result = await changeMeetingHost({
                groupId,
                hostUserId: selected,
                expectedHostUserId: hostUserId,
            });
            if (!result.success) {
                toast.error(t("hostUnavailable"));
                return;
            }
            setOpen(false);
            toast.success(t("hostChanged"));
            router.refresh();
        } catch {
            toast.error(t("error"));
        } finally {
            saving.current = false;
            setPending(false);
        }
    }
    return (
        <div className="space-y-2">
            <label htmlFor={`host-${groupId}`} className="text-sm font-medium">
                {t("chooseHost")}
            </label>
            <select
                id={`host-${groupId}`}
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                disabled={pending}
                className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
            >
                {supervisors.map((member) => (
                    <option key={member.id} value={member.id}>
                        {member.name}
                    </option>
                ))}
            </select>
            <Button
                variant="outline"
                type="button"
                disabled={pending || selected === hostUserId}
                onClick={() => setOpen(true)}
            >
                {t("handover")}
            </Button>
            <ConfirmationDialog
                open={open}
                onOpenChange={setOpen}
                title={t("handoverTitle")}
                description={t("handoverDescription")}
                confirmLabel={t("handover")}
                cancelLabel={t("cancel")}
                pending={pending}
                onConfirm={save}
            />
        </div>
    );
}
