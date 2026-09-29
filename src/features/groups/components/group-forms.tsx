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
import type { MeetingScheduleSlot } from "../meeting-types";
import createGroup from "../server/create-group";
import joinGroup from "../server/join-group";
import MeetingScheduleFields from "./meeting-schedule-fields";

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
    const [schedule, setSchedule] = useState<MeetingScheduleSlot[]>([
        { weekday: 1, localTime: "20:00" },
    ]);
    const [timezone, setTimezone] = useState("");

    async function create(formData: FormData) {
        setIsSubmitting(true);
        const result = await createGroup({
            name: formData.get("name"),
            description: formData.get("description"),
            schedule,
            timezone,
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
        <section className="mt-10 rounded-3xl border border-border/60 bg-card/45 p-4 shadow-sm sm:mt-12 sm:p-6 lg:p-7">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:inline-grid sm:min-w-80">
                <button
                    type="button"
                    disabled={isSubmitting}
                    aria-pressed={mode === "create"}
                    onClick={() => setMode("create")}
                    className={cn(
                        "flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        mode === "create"
                            ? "bg-primary text-primary-foreground shadow-sm"
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
                        "flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        mode === "join"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    <DoorOpen aria-hidden="true" className="size-4" />
                    {t("join.title")}
                </button>
            </div>

            <div className="mt-7 grid gap-7 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12">
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
                        className="space-y-5"
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
                                className="mt-2 h-12 rounded-xl bg-muted/30"
                            />
                        </div>
                        <div className="border-border/60 border-t pt-5">
                            <MeetingScheduleFields
                                schedule={schedule}
                                setSchedule={setSchedule}
                                timezone={timezone}
                                setTimezone={setTimezone}
                                disabled={isSubmitting}
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
                                className="mt-2 min-h-24 rounded-xl bg-muted/30"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !timezone}
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
                        className="space-y-5"
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
                                className="mt-2 h-12 rounded-xl bg-muted/30 font-mono uppercase tracking-[0.18em]"
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
