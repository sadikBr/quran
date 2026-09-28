"use client";

import { DoorOpen, LoaderCircle, Plus, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import createGroup from "../server/create-group";
import joinGroup from "../server/join-group";

export default function GroupForms({
    initialInviteCode = "",
}: {
    initialInviteCode?: string;
}) {
    const t = useTranslations("Groups");
    const router = useRouter();
    const [mode, setMode] = useState<"create" | "join">(
        initialInviteCode ? "join" : "create",
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function create(formData: FormData) {
        setIsSubmitting(true);
        const result = await createGroup({
            name: formData.get("name"),
            description: formData.get("description"),
        });
        setIsSubmitting(false);

        if (!result.success) {
            toast.error(t("create.error"));
            return;
        }

        toast.success(t("create.success"));
        router.push(`/groups/${result.groupId}`);
        router.refresh();
    }

    async function join(formData: FormData) {
        setIsSubmitting(true);
        const result = await joinGroup({
            inviteCode: formData.get("inviteCode"),
        });
        setIsSubmitting(false);

        if (!result.success) {
            toast.error(
                t(
                    result.reason === "not_found"
                        ? "join.notFound"
                        : "join.error",
                ),
            );
            return;
        }

        toast.success(t("join.success"));
        router.push(`/groups/${result.groupId}`);
        router.refresh();
    }

    return (
        <section className="mt-10 overflow-hidden rounded-3xl bg-muted/40 p-2 ring-1 ring-border/50 sm:p-3">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-background/45 p-1.5">
                <button
                    type="button"
                    disabled={isSubmitting}
                    aria-pressed={mode === "create"}
                    onClick={() => setMode("create")}
                    className={cn(
                        "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                        mode === "create"
                            ? "bg-background text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    <Plus aria-hidden="true" className="size-4" />
                    {t("create.title")}
                </button>
                <button
                    type="button"
                    disabled={isSubmitting}
                    aria-pressed={mode === "join"}
                    onClick={() => setMode("join")}
                    className={cn(
                        "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                        mode === "join"
                            ? "bg-background text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    <DoorOpen aria-hidden="true" className="size-4" />
                    {t("join.title")}
                </button>
            </div>

            <div className="p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {mode === "create" ? (
                            <UsersRound aria-hidden="true" className="size-5" />
                        ) : (
                            <DoorOpen aria-hidden="true" className="size-5" />
                        )}
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold">
                            {t(`${mode}.title`)}
                        </h2>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                            {t(`${mode}.description`)}
                        </p>
                    </div>
                </div>

                {mode === "create" ? (
                    <form
                        action={create}
                        aria-busy={isSubmitting}
                        className="mt-6 space-y-5"
                    >
                        <div>
                            <Label htmlFor="group-name">
                                {t("create.name")}
                            </Label>
                            <Input
                                id="group-name"
                                name="name"
                                required
                                disabled={isSubmitting}
                                minLength={2}
                                maxLength={80}
                                placeholder={t("create.namePlaceholder")}
                                className="mt-2 h-12 rounded-xl bg-background/70"
                            />
                        </div>
                        <div>
                            <Label htmlFor="group-description">
                                {t("create.details")}
                            </Label>
                            <Textarea
                                id="group-description"
                                name="description"
                                maxLength={300}
                                disabled={isSubmitting}
                                placeholder={t("create.detailsPlaceholder")}
                                className="mt-2 min-h-24 rounded-xl bg-background/70"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-11 w-full rounded-xl sm:w-auto"
                        >
                            {isSubmitting && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {t(
                                isSubmitting
                                    ? "create.submitting"
                                    : "create.submit",
                            )}
                        </Button>
                    </form>
                ) : (
                    <form
                        action={join}
                        aria-busy={isSubmitting}
                        className="mt-6 space-y-5"
                    >
                        <div>
                            <Label htmlFor="invite-code">
                                {t("join.code")}
                            </Label>
                            <Input
                                id="invite-code"
                                name="inviteCode"
                                required
                                disabled={isSubmitting}
                                defaultValue={initialInviteCode}
                                placeholder={t("join.codePlaceholder")}
                                autoCapitalize="characters"
                                className="mt-2 h-12 rounded-xl bg-background/70 font-mono uppercase tracking-[0.18em]"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-11 w-full rounded-xl sm:w-auto"
                        >
                            {isSubmitting && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {t(
                                isSubmitting
                                    ? "join.submitting"
                                    : "join.submit",
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </section>
    );
}
