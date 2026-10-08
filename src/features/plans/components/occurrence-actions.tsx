"use client";
import { Check, LoaderCircle, SkipForward, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PlanningTask } from "@/features/planning/planner";
import { setPersonalOccurrence } from "../server/actions";

export default function OccurrenceActions({
    occurrence,
    onChanged,
    disabled = false,
    checklist = false,
}: {
    occurrence: NonNullable<PlanningTask["recurring"]>;
    onChanged?: () => void;
    disabled?: boolean;
    checklist?: boolean;
}) {
    const t = useTranslations("Plans"),
        router = useRouter();
    const [pending, startTransition] = useTransition();
    if (
        !occurrence.actionable ||
        (checklist && occurrence.status !== "pending")
    )
        return null;
    function update(status: "pending" | "completed" | "skipped") {
        startTransition(async () => {
            try {
                const result = await setPersonalOccurrence({
                    id: occurrence.planId,
                    revision: occurrence.revision,
                    date: occurrence.date,
                    status,
                });
                if (!result.success) {
                    toast.error(t(`errors.${result.reason}`));
                    router.refresh();
                    return;
                }
                onChanged?.();
                router.refresh();
            } catch {
                toast.error(t("errors.failed"));
            }
        });
    }
    return (
        <div className="flex flex-wrap gap-2" aria-busy={pending}>
            {occurrence.status === "pending" ? (
                <>
                    {!checklist && (
                        <Button
                            size="sm"
                            disabled={pending || disabled}
                            onClick={() => update("completed")}
                        >
                            {pending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {t("complete")}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending || disabled}
                        onClick={() => update("skipped")}
                    >
                        <SkipForward className="size-4" />
                        {t("skip")}
                    </Button>
                </>
            ) : (
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending || disabled}
                    onClick={() => update("pending")}
                >
                    <Undo2 className="size-4" />
                    {t("undo")}
                </Button>
            )}
        </div>
    );
}
