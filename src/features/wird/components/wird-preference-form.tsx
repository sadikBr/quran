"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import updateWirdPreference from "../server/update-wird-preference";
import type { WirdUnit } from "../types";

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
}: {
    initialUnit?: WirdUnit;
    initialAmount?: number;
    compact?: boolean;
}) {
    const router = useRouter();
    const t = useTranslations("Wird");
    const [unit, setUnit] = useState<WirdUnit>(initialUnit);
    const [amount, setAmount] = useState(initialAmount);
    const [isSaving, setIsSaving] = useState(false);
    const unitOptions: WirdUnit[] = ["ayah", "quarter", "hizb", "surah"];

    async function save() {
        setIsSaving(true);
        const result = await updateWirdPreference({ unit, amount });
        setIsSaving(false);

        if (!result.success) {
            toast.error(t("setup.error"));
            return;
        }

        toast.success(t("setup.success"));
        router.refresh();
    }

    return (
        <form
            className={compact ? "space-y-5" : "mt-8 space-y-6"}
            onSubmit={(event) => {
                event.preventDefault();
                save();
            }}
        >
            <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    {t("setup.unitLabel")}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted/45 p-1 sm:grid-cols-4">
                    {unitOptions.map((option) => (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={unit === option}
                            onClick={() => {
                                setUnit(option);
                                setAmount((current) =>
                                    Math.min(current, MAX_AMOUNTS[option]),
                                );
                            }}
                            className={cn(
                                "min-h-11 cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow]",
                                unit === option &&
                                    "bg-background text-foreground shadow-sm",
                            )}
                        >
                            {t(`units.${option}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-5 rounded-2xl bg-primary/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                        {t("setup.amountLabel")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("setup.preview", {
                            amount,
                            unit: t(`units.${unit}`),
                        })}
                    </p>
                </div>
                <div dir="ltr" className="flex items-center gap-4 self-center">
                    <button
                        type="button"
                        onClick={() =>
                            setAmount((value) => Math.max(1, value - 1))
                        }
                        disabled={amount <= 1}
                        aria-label={t("setup.decrease")}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                    >
                        <Minus aria-hidden="true" className="size-4" />
                    </button>
                    <span className="min-w-10 text-center text-3xl font-semibold text-foreground tabular-nums">
                        {amount}
                    </span>
                    <button
                        type="button"
                        onClick={() =>
                            setAmount((value) =>
                                Math.min(MAX_AMOUNTS[unit], value + 1),
                            )
                        }
                        disabled={amount >= MAX_AMOUNTS[unit]}
                        aria-label={t("setup.increase")}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                        <Plus aria-hidden="true" className="size-4" />
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} className="min-w-40">
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
