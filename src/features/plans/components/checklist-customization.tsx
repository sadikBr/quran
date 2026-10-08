"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CHECKLIST_CHOICES, type ChecklistSettings } from "../daily-checklist";
import { updateChecklistSettings } from "../server/daily-checklist-actions";

export default function ChecklistCustomization({
    settings,
}: {
    settings: ChecklistSettings;
}) {
    const t = useTranslations("Plans.checklist");
    const locale = useLocale();
    const router = useRouter();
    const prefix = useId();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    return (
        <Dialog.Root
            open={open}
            onOpenChange={(value) => {
                if (!pending) {
                    setOpen(value);
                    setError(null);
                }
            }}
        >
            <Dialog.Trigger asChild>
                <Button variant="outline">
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                    {t("customize")}
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <Dialog.Content
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="fixed start-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-background p-5 text-foreground shadow-xl rtl:translate-x-1/2 sm:p-6"
                >
                    <div className="flex items-center justify-between gap-3">
                        <Dialog.Title className="text-xl font-semibold">
                            {t("customize")}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={pending}
                                aria-label={t("close")}
                            >
                                <X className="size-4" />
                            </Button>
                        </Dialog.Close>
                    </div>
                    <Dialog.Description className="mt-2 text-sm leading-7 text-muted-foreground">
                        {t("customizeHint")}
                    </Dialog.Description>
                    <form
                        key={`${settings.revision}:${settings.resetAt}`}
                        className="mt-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            const visible = new FormData(
                                event.currentTarget,
                            ).getAll("visible");
                            startTransition(async () => {
                                try {
                                    const result =
                                        await updateChecklistSettings({
                                            ...settings,
                                            visible,
                                        });
                                    if (!result.success) {
                                        setError(result.reason);
                                        router.refresh();
                                        return;
                                    }
                                    setOpen(false);
                                    router.refresh();
                                } catch {
                                    setError("failed");
                                }
                            });
                        }}
                    >
                        <fieldset disabled={pending} className="space-y-1">
                            <legend className="sr-only">
                                {t("customize")}
                            </legend>
                            {CHECKLIST_CHOICES.map((choice) => (
                                <label
                                    key={choice}
                                    htmlFor={`${prefix}-${choice}`}
                                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
                                >
                                    <input
                                        id={`${prefix}-${choice}`}
                                        name="visible"
                                        type="checkbox"
                                        value={choice}
                                        defaultChecked={settings.visible.includes(
                                            choice,
                                        )}
                                        className="size-5 shrink-0 accent-primary"
                                    />
                                    <span className="text-sm">
                                        {t(`choices.${choice}`)}
                                    </span>
                                </label>
                            ))}
                        </fieldset>
                        <p className="mt-3 text-xs leading-6 text-muted-foreground">
                            {t("privacyHint")}
                        </p>
                        {error && (
                            <p
                                role="alert"
                                className="mt-3 text-sm text-destructive"
                            >
                                {t(`errors.${error}`)}
                            </p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <Dialog.Close asChild>
                                <Button variant="outline" disabled={pending}>
                                    {t("cancel")}
                                </Button>
                            </Dialog.Close>
                            <Button disabled={pending} type="submit">
                                {t(pending ? "saving" : "save")}
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
