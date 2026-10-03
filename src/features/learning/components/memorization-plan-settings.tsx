"use client";

import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { MemorizationSettings } from "../schedule";
import {
    PlanAmountChoices,
    PlanEditor,
    PlanReadingFields,
    planInputClass,
} from "./weekly-plan-ui";

export default function MemorizationPlanSettings({
    settings,
    days,
    pending,
    hasPlan,
    regenerating = false,
    onChange,
    onPreview,
    onCancel,
}: {
    settings: MemorizationSettings;
    days: number[];
    pending: boolean;
    hasPlan: boolean;
    regenerating?: boolean;
    onChange: (value: Partial<MemorizationSettings>) => void;
    onPreview: () => void;
    onCancel: () => void;
}) {
    const t = useTranslations("Memorization.learning");
    const locale = useLocale();
    return (
        <PlanEditor
            kind="memorization"
            intro={t("editorIntro")}
            days={days}
            amount={settings.quartersPerWeek / 4}
            amountLabel={t("weeklyTarget")}
            summaryHint={t("editorSummaryHint")}
            riwayah={settings.riwayah}
            pending={pending}
            hasPlan={hasPlan}
            regenerating={regenerating}
            canPreview={
                Boolean(settings.timezone.trim()) &&
                Number.isInteger(settings.quartersPerWeek) &&
                settings.quartersPerWeek >= 1 &&
                settings.quartersPerWeek <= 28
            }
            onPreview={onPreview}
            onCancel={onCancel}
        >
            <fieldset>
                <legend className="mb-3 text-sm font-medium">
                    {t("weeklyAmount")}
                </legend>
                <PlanAmountChoices
                    kind="memorization"
                    amount={settings.quartersPerWeek}
                    onChange={(quartersPerWeek) =>
                        onChange({ quartersPerWeek })
                    }
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <label
                        htmlFor="memorization-target"
                        className="text-sm font-medium"
                    >
                        {t("target")}
                    </label>
                    <Input
                        id="memorization-target"
                        type="number"
                        min={1}
                        max={28}
                        step={1}
                        required
                        value={settings.quartersPerWeek || ""}
                        onChange={(e) =>
                            onChange({
                                quartersPerWeek: Number(e.target.value),
                            })
                        }
                        className={`${planInputClass} w-24`}
                    />
                </div>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {t("targetHint", {
                        hizbs: new Intl.NumberFormat(locale).format(
                            settings.quartersPerWeek / 4,
                        ),
                    })}
                </p>
            </fieldset>
            <fieldset
                className="border-t border-border/35 pt-5"
                aria-describedby="memorization-auto-start"
            >
                <legend className="mb-3 text-sm font-medium">
                    {t("direction")}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                    {(["forward", "backward"] as const).map((direction) => (
                        <label
                            key={direction}
                            className="min-w-0 cursor-pointer"
                        >
                            <input
                                type="radio"
                                name="memorization-direction"
                                value={direction}
                                checked={settings.direction === direction}
                                onChange={() => onChange({ direction })}
                                className="peer sr-only"
                            />
                            <span className="flex h-full min-h-20 items-center justify-center rounded-2xl border border-border/40 bg-background/30 p-4 text-center text-sm leading-6 text-muted-foreground transition-colors hover:border-primary/30 peer-checked:border-primary/40 peer-checked:bg-primary/[0.08] peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                                {t(direction)}
                            </span>
                        </label>
                    ))}
                </div>
                <p
                    id="memorization-auto-start"
                    className="mt-3 text-xs leading-6 text-muted-foreground"
                >
                    {t("automaticStartHint")}
                </p>
            </fieldset>
            <PlanReadingFields
                kind="memorization"
                riwayah={settings.riwayah}
                timezone={settings.timezone}
                onChange={onChange}
            />
        </PlanEditor>
    );
}
