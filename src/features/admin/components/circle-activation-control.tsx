"use client";

import { Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import setCircleActive from "../server/set-circle-active";

export default function CircleActivationControl({
    groupId,
    name,
    isActive,
    hasSupervisor,
}: {
    groupId: string;
    name: string;
    isActive: boolean;
    hasSupervisor: boolean;
}) {
    const t = useTranslations("Admin");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    async function confirm() {
        setPending(true);
        try {
            const result = await setCircleActive({
                groupId,
                isActive: !isActive,
            });
            if (!result.success) {
                toast.error(
                    t(
                        result.reason === "active_meeting"
                            ? "activationActiveMeeting"
                            : result.reason === "supervisor_required"
                              ? "activationSupervisorRequired"
                              : result.reason === "schedule_required"
                                ? "activationScheduleRequired"
                                : "failed",
                    ),
                );
                return;
            }
            setOpen(false);
            toast.success(
                t(isActive ? "circle_deactivated" : "circle_activated"),
            );
            router.refresh();
        } catch {
            toast.error(t("failed"));
        } finally {
            setPending(false);
        }
    }
    return (
        <div className="mt-auto space-y-3 bg-muted/20 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                    className={`max-w-full rounded-full px-3 py-1.5 text-xs font-medium leading-5 ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                    {t(isActive ? "active" : "inactive")}
                </span>
                <Button
                    className="min-h-11 max-w-full whitespace-normal text-start"
                    variant={isActive ? "outline" : "default"}
                    disabled={!isActive && !hasSupervisor}
                    onClick={() => setOpen(true)}
                >
                    {isActive ? (
                        <Pause aria-hidden="true" />
                    ) : (
                        <Play aria-hidden="true" />
                    )}
                    {t(isActive ? "deactivate" : "activate")}
                </Button>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
                {t(
                    !isActive && !hasSupervisor
                        ? "activationSupervisorRequired"
                        : isActive
                          ? "activeHint"
                          : "inactiveHint",
                )}
            </p>
            <ConfirmationDialog
                open={open}
                onOpenChange={setOpen}
                title={t(isActive ? "deactivateTitle" : "activateTitle", {
                    name,
                })}
                description={t(isActive ? "deactivateHint" : "activateHint")}
                confirmLabel={t(isActive ? "deactivate" : "activate")}
                cancelLabel={t("cancel")}
                pending={pending}
                onConfirm={confirm}
            />
        </div>
    );
}
