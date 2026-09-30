"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertDialog } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { WirdCompletion } from "../completion";
import completeDailyWird from "../server/complete-daily-wird";

export default function CompleteWirdButton({
    disabled = false,
    portion,
}: {
    disabled?: boolean;
    portion: WirdCompletion;
}) {
    const router = useRouter();
    const t = useTranslations("Wird.today");
    const [isCompleting, setIsCompleting] = useState(false);
    const [open, setOpen] = useState(false);
    const [conflict, setConflict] = useState(false);
    const locale = useLocale();

    async function complete() {
        if (isCompleting) return;
        setIsCompleting(true);
        try {
            const result = await completeDailyWird(portion);
            if (!result.success) {
                if ("conflict" in result && result.conflict) {
                    toast.error(
                        locale === "ar"
                            ? "تغيّر هذا الورد. راجع الورد المحدّث قبل إتمامه."
                            : "This portion changed. Review the updated portion before completing it.",
                    );
                    setOpen(false);
                    setConflict(true);
                    return;
                }
                toast.error(t("completeError"));
                return;
            }
            toast.success(t("completeSuccess"));
            setOpen(false);
            router.refresh();
        } catch {
            toast.error(t("completeError"));
        } finally {
            setIsCompleting(false);
        }
    }

    if (conflict)
        return (
            <Button variant="outline" onClick={() => window.location.reload()}>
                {locale === "ar" ? "تحميل الورد المحدّث" : "Load latest portion"}
            </Button>
        );

    return (
        <AlertDialog.Root
            open={open}
            onOpenChange={(value) => {
                if (!isCompleting) setOpen(value);
            }}
        >
            <AlertDialog.Trigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={isCompleting || disabled}
                    className="min-h-11 gap-2"
                >
                    <Check aria-hidden="true" className="size-4" />
                    {isCompleting ? t("completing") : t("markComplete")}
                </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
                <AlertDialog.Content
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background p-5 text-foreground shadow-xl"
                >
                    <AlertDialog.Title className="text-lg font-semibold">
                        {t("confirmTitle")}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-sm leading-7 text-muted-foreground">
                        {t("confirmDescription")}
                    </AlertDialog.Description>
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <AlertDialog.Cancel asChild>
                            <Button variant="outline" disabled={isCompleting}>
                                {t("cancel")}
                            </Button>
                        </AlertDialog.Cancel>
                        <Button disabled={isCompleting} onClick={complete}>
                            {isCompleting
                                ? t("completing")
                                : t("confirmComplete")}
                        </Button>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
