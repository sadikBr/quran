"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
    PlanAmountChoices,
    PlanEditor,
    PlanReadingFields,
} from "@/features/learning/components/weekly-plan-ui";
import { cn } from "@/lib/utils";
import type { RevisionSettings } from "../schedule";

export default function RevisionPlanSettings({
    settings,
    pending,
    hasPlan,
    regenerating = false,
    onChange,
    onPreview,
    onCancel,
}: {
    settings: RevisionSettings;
    pending: boolean;
    hasPlan: boolean;
    regenerating?: boolean;
    onChange: (value: Partial<RevisionSettings>) => void;
    onPreview: () => void;
    onCancel: () => void;
}) {
    const t = useTranslations("Memorization.weekly");
    const reminders = settings.reminderTime !== null;
    return (
        <PlanEditor
            kind="revision"
            intro={t("editor.intro")}
            days={settings.days}
            amount={(settings.days.length * settings.quartersPerDay) / 4}
            amountLabel={t("editor.weeklyMaximum")}
            summaryHint={t("editor.limitHint")}
            riwayah={settings.riwayah}
            pending={pending}
            hasPlan={hasPlan}
            regenerating={regenerating}
            canPreview={Boolean(settings.timezone.trim())}
            onPreview={onPreview}
            onCancel={onCancel}
        >
            <fieldset>
                <legend className="mb-3 text-sm font-medium">
                    {t("amount")}
                </legend>
                <PlanAmountChoices
                    kind="revision"
                    amount={settings.quartersPerDay}
                    onChange={(quartersPerDay) =>
                        onChange({
                            quartersPerDay: quartersPerDay as 1 | 2 | 4,
                        })
                    }
                />
            </fieldset>
            <PlanReadingFields
                kind="revision"
                riwayah={settings.riwayah}
                timezone={settings.timezone}
                onChange={onChange}
            />
            <div
                className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    reminders
                        ? "border-primary/25 bg-primary/[0.04]"
                        : "border-border/35 bg-background/20",
                )}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Bell
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground"
                        />
                        <div>
                            <p
                                id="revision-reminder-label"
                                className="text-sm font-medium"
                            >
                                {t("reminder")}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t("editor.reminderHint")}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={reminders}
                        aria-labelledby="revision-reminder-label"
                        disabled={pending}
                        onClick={() =>
                            onChange({
                                reminderTime: reminders ? null : "19:00",
                            })
                        }
                        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                    >
                        <span
                            aria-hidden="true"
                            dir="ltr"
                            className={cn(
                                "relative block h-6 w-11 rounded-full border transition-colors",
                                reminders
                                    ? "border-primary bg-primary"
                                    : "border-border bg-muted",
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute left-0.5 top-0.5 size-[18px] rounded-full transition-transform",
                                    reminders
                                        ? "translate-x-5 bg-primary-foreground"
                                        : "bg-muted-foreground",
                                )}
                            />
                        </span>
                    </button>
                </div>
                {reminders && (
                    <div className="mt-4 space-y-3 border-t border-primary/15 pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <label
                                htmlFor="revision-reminder-time"
                                className="text-sm"
                            >
                                {t("reminderTime")}
                            </label>
                            <Input
                                id="revision-reminder-time"
                                type="time"
                                disabled={pending}
                                value={settings.reminderTime ?? ""}
                                onChange={(e) =>
                                    onChange({
                                        reminderTime: e.target.value,
                                    })
                                }
                                className="h-11 w-auto min-w-32 rounded-xl border-border/40 bg-background/30 dark:bg-background/30"
                            />
                        </div>
                        <p className="text-xs leading-6 text-muted-foreground">
                            {t("reminderHint")}{" "}
                            <Link
                                href="/settings"
                                className="text-primary underline underline-offset-4"
                            >
                                {t("deviceSettings")}
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </PlanEditor>
    );
}
