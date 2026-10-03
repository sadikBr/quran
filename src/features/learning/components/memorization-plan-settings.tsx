"use client";

import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { MemorizationSettings } from "../schedule";
import type { MemorizationPlanView } from "../server/service";
import {
    PlanAmountChoices,
    PlanEditor,
    PlanReadingFields,
    type PlanSurah,
    planInputClass,
} from "./weekly-plan-ui";

export default function MemorizationPlanSettings({
    settings,
    days,
    quarterStarts,
    surahs,
    pending,
    hasPlan,
    regenerating = false,
    onChange,
    onPreview,
    onCancel,
}: {
    settings: MemorizationSettings;
    days: number[];
    quarterStarts: MemorizationPlanView["quarterStarts"];
    surahs: PlanSurah[];
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
            <div className="space-y-5 border-t border-border/35 pt-5">
                <div>
                    <label
                        htmlFor="memorization-start"
                        className="mb-2.5 block text-sm font-medium"
                    >
                        {t("startQuarter")}
                    </label>
                    <select
                        id="memorization-start"
                        className={planInputClass}
                        value={settings.startQuarter}
                        onChange={(e) =>
                            onChange({ startQuarter: Number(e.target.value) })
                        }
                    >
                        {quarterStarts[settings.riwayah].map((q) => (
                            <option key={q.quarter} value={q.quarter}>
                                {t("quarterOption", {
                                    hizb: q.hizb,
                                    quarter: ((q.quarter - 1) % 4) + 1,
                                    surah:
                                        surahs.find(
                                            (s) => s.number === q.surahNumber,
                                        )?.[
                                            locale === "ar"
                                                ? "name"
                                                : "englishName"
                                        ] ?? q.surahNumber,
                                    ayah: q.ayahNumber,
                                })}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        {t("quarterHint")}
                    </p>
                </div>
                <div>
                    <label
                        htmlFor="memorization-direction"
                        className="mb-2.5 block text-sm font-medium"
                    >
                        {t("direction")}
                    </label>
                    <select
                        id="memorization-direction"
                        className={planInputClass}
                        value={settings.direction}
                        onChange={(e) =>
                            onChange({
                                direction: e.target.value as
                                    | "forward"
                                    | "backward",
                            })
                        }
                    >
                        <option value="forward">{t("forward")}</option>
                        <option value="backward">{t("backward")}</option>
                    </select>
                </div>
            </div>
            <PlanReadingFields
                kind="memorization"
                riwayah={settings.riwayah}
                timezone={settings.timezone}
                onChange={onChange}
            />
        </PlanEditor>
    );
}
