"use client";

import { ArrowDown, Minus, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import updateWirdPreference from "../server/update-wird-preference";
import { WIRD_UNITS, type WirdUnit } from "../types";

const MAX_AMOUNTS: Record<WirdUnit, number> = {
    ayah: 100,
    page: 50,
    quarter: 8,
    hizb: 4,
    juz: 3,
    surah: 5,
};

export default function WirdPreferenceForm({
    initialUnit = "ayah",
    initialAmount = 10,
    compact = false,
    managedByPlan = false,
}: {
    initialUnit?: WirdUnit;
    initialAmount?: number;
    compact?: boolean;
    managedByPlan?: boolean;
}) {
    const router = useRouter();
    const t = useTranslations("Wird");
    const [unit, setUnit] = useState<WirdUnit>(initialUnit);
    const [amount, setAmount] = useState(initialAmount);
    const [isSaving, setIsSaving] = useState(false);
    const unitGroupId = useId();

    async function save() {
        if (isSaving || managedByPlan) return;
        setIsSaving(true);
        try {
            const result = await updateWirdPreference({ unit, amount });

            if (!result.success) {
                toast.error(
                    t(
                        result.message === "planManaged"
                            ? "setup.planManaged"
                            : "setup.error",
                    ),
                );
                return;
            }

            toast.success(t("setup.success"));
            router.refresh();
        } catch {
            toast.error(t("setup.error"));
        } finally {
            setIsSaving(false);
        }
    }

    if (managedByPlan) {
        return (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <Sparkles
                        aria-hidden="true"
                        className="mt-1 size-5 shrink-0 text-primary"
                    />
                    <div>
                        <p className="text-sm font-semibold">
                            {t("setup.managedTitle")}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-primary">
                            {t("setup.preview", {
                                amount: initialAmount,
                                unit: initialUnit,
                            })}
                        </p>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                            {t("setup.planManaged")}
                        </p>
                    </div>
                </div>
                <Button
                    asChild
                    variant="outline"
                    className="min-h-11 shrink-0 rounded-xl"
                >
                    <a href="#khatmah-plan">
                        {t("setup.viewPlan")}
                        <ArrowDown aria-hidden="true" className="size-4" />
                    </a>
                </Button>
            </div>
        );
    }

    return (
        <form
            className="space-y-5"
            onSubmit={(event) => {
                event.preventDefault();
                save();
            }}
        >
            <fieldset
                disabled={isSaving}
                className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem] md:gap-8"
            >
                <fieldset>
                    <legend className="text-sm font-semibold">
                        {t("setup.unitLabel")}
                    </legend>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {WIRD_UNITS.map((option) => (
                            <label
                                key={option}
                                className="relative cursor-pointer"
                            >
                                <input
                                    type="radio"
                                    name={unitGroupId}
                                    value={option}
                                    checked={unit === option}
                                    onChange={() => {
                                        setUnit(option);
                                        setAmount((current) =>
                                            Math.min(
                                                current,
                                                MAX_AMOUNTS[option],
                                            ),
                                        );
                                    }}
                                    className="peer sr-only"
                                />
                                <span
                                    className={cn(
                                        "flex min-h-11 items-center justify-center rounded-xl border border-border/70 bg-background px-3 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                                        unit === option &&
                                            "border-primary bg-primary/10 text-primary",
                                    )}
                                >
                                    {t(`units.${option}`)}
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div>
                    <p className="text-sm font-semibold">
                        {t("setup.amountLabel")}
                    </p>
                    <div
                        dir="ltr"
                        className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background p-1"
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                                setAmount((value) => Math.max(1, value - 1))
                            }
                            disabled={amount <= 1}
                            aria-label={t("setup.decrease")}
                            className="size-11 rounded-lg text-muted-foreground"
                        >
                            <Minus aria-hidden="true" className="size-4" />
                        </Button>
                        <output
                            className="min-w-12 text-center text-2xl font-semibold tabular-nums"
                            aria-live="polite"
                        >
                            {amount}
                        </output>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                                setAmount((value) =>
                                    Math.min(MAX_AMOUNTS[unit], value + 1),
                                )
                            }
                            disabled={amount >= MAX_AMOUNTS[unit]}
                            aria-label={t("setup.increase")}
                            className="size-11 rounded-lg bg-primary/10 text-primary hover:bg-primary/15"
                        >
                            <Plus aria-hidden="true" className="size-4" />
                        </Button>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("setup.preview", {
                            amount,
                            unit,
                        })}
                    </p>
                </div>
            </fieldset>
            <div className="flex flex-col gap-4 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {compact && (
                    <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                        {t("setup.nextPortion")}
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="min-h-11 shrink-0 rounded-xl sm:ms-auto sm:min-w-40"
                >
                    {isSaving
                        ? t("setup.saving")
                        : initialUnit === "ayah" &&
                            initialAmount === 10 &&
                            !compact
                          ? t("setup.save")
                          : t("setup.update")}
                </Button>
            </div>
        </form>
    );
}
