"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import AdhkarReminderSettings from "@/features/adhkar/components/adhkar-reminder-settings";
import PushNotificationSetting from "@/features/notifications/components/push-notification-setting";
import OfflineLibrarySetting from "@/features/offline/components/offline-library-setting";
import EditionCombobox from "@/features/quran/components/edition-combobox";
import ReciterCombobox from "@/features/quran/components/reciter-combobox";
import ReciterCoverage from "@/features/quran/components/reciter-coverage";
import type { Edition, Reciter, SurahType } from "@/features/quran/types";
import ThemeSelector from "@/features/settings/components/theme-selector";
import { useSettings } from "@/features/settings/settings-provider";
import { cn } from "@/lib/utils";
import { vibrate } from "../device-feedback";
import {
    isArabicTextEditionCompatible,
    isReciterCompatible,
} from "../edition-compatibility";
import {
    type ArabicTextSize,
    DEFAULT_PREFERENCES,
    type Language,
    type Preferences,
    type ReadingMode,
    type Riwayah,
} from "../preferences";
import updatePreferences from "../server/update-preferences";
import PreferenceCard from "./settings-card";
import SettingField from "./settings-field";
import SettingsSection from "./settings-section";

const TRANSLATION_NAME_KEYS = {
    "en.ahmedali": "ahmedAli",
    "en.ahmedraza": "ahmedRaza",
    "en.arberry": "arberry",
    "en.asad": "asad",
    "en.daryabadi": "daryabadi",
    "en.hilali": "hilali",
    "en.pickthall": "pickthall",
    "en.qaribullah": "qaribullah",
    "en.sahih": "sahih",
    "en.sarwar": "sarwar",
    "en.yusufali": "yusufAli",
    "en.maududi": "maududi",
    "en.shakir": "shakir",
    "en.itani": "itani",
    "en.mubarakpuri": "mubarakpuri",
    "en.qarai": "qarai",
    "en.wahiduddin": "wahiduddin",
} as const;

export default function SettingsForm({
    surahs = [],
    preferences,
    vapidPublicKey,
    arabicEditions,
    reciters,
    translationEditions,
    tafsirEditions,
}: {
    surahs?: SurahType[];
    preferences: Preferences;
    vapidPublicKey: string | null;
    arabicEditions: Edition[];
    reciters: Reciter[];
    translationEditions: Edition[];
    tafsirEditions: Edition[];
}) {
    const router = useRouter();
    const t = useTranslations("Settings");
    const commonT = useTranslations("Common");
    const locale = useLocale();
    const direction = locale === "ar" ? "rtl" : "ltr";
    const { setTheme } = useTheme();
    const { setPreferences, theme: syncedTheme } = useSettings();
    const [values, setValues] = useState(() => {
        const selectedArabicEdition = arabicEditions.find(
            (edition) => edition.identifier === preferences.arabicEdition,
        );
        const selectedReciter = reciters.find(
            (reciter) => reciter.id === preferences.reciter,
        );
        const fallbackReciter = reciters.find((reciter) =>
            isReciterCompatible(
                reciter,
                preferences.readingMode,
                preferences.riwayah,
            ),
        );

        return {
            ...preferences,
            arabicEdition:
                selectedArabicEdition &&
                isArabicTextEditionCompatible(selectedArabicEdition)
                    ? preferences.arabicEdition
                    : DEFAULT_PREFERENCES.arabicEdition,
            reciter:
                selectedReciter &&
                isReciterCompatible(
                    selectedReciter,
                    preferences.readingMode,
                    preferences.riwayah,
                )
                    ? preferences.reciter
                    : (fallbackReciter?.id ?? DEFAULT_PREFERENCES.reciter),
        };
    });
    const [isSaving, setIsSaving] = useState(false);
    const availableArabicEditions = arabicEditions.filter(
        isArabicTextEditionCompatible,
    );
    const availableReciters = reciters.filter((reciter) =>
        isReciterCompatible(reciter, values.readingMode, values.riwayah),
    );
    const selectClassName =
        "h-11 w-full rounded-xl border-0 bg-muted/45 px-4 shadow-none transition-colors hover:bg-muted/70 focus-visible:ring-1 focus-visible:ring-primary/30";

    useEffect(() => {
        setValues((currentValues) =>
            currentValues.theme === syncedTheme
                ? currentValues
                : { ...currentValues, theme: syncedTheme },
        );
    }, [syncedTheme]);

    function updateValue<Key extends keyof Preferences>(
        key: Key,
        value: Preferences[Key],
    ) {
        setValues((currentValues) => ({ ...currentValues, [key]: value }));
    }

    function updateReadingMode(readingMode: ReadingMode) {
        setValues((currentValues) => {
            const selectedReciter = reciters.find(
                (reciter) => reciter.id === currentValues.reciter,
            );
            const fallbackReciter = reciters.find((reciter) =>
                isReciterCompatible(
                    reciter,
                    readingMode,
                    currentValues.riwayah,
                ),
            );

            return {
                ...currentValues,
                readingMode,
                reciter:
                    selectedReciter &&
                    isReciterCompatible(
                        selectedReciter,
                        readingMode,
                        currentValues.riwayah,
                    )
                        ? currentValues.reciter
                        : (fallbackReciter?.id ?? currentValues.reciter),
            };
        });
    }

    function updateRiwayah(riwayah: Riwayah) {
        setValues((currentValues) => {
            const selectedReciter = reciters.find(
                (reciter) => reciter.id === currentValues.reciter,
            );
            const fallbackReciter = reciters.find((reciter) =>
                isReciterCompatible(
                    reciter,
                    currentValues.readingMode,
                    riwayah,
                ),
            );

            return {
                ...currentValues,
                riwayah,
                reciter:
                    selectedReciter &&
                    isReciterCompatible(
                        selectedReciter,
                        currentValues.readingMode,
                        riwayah,
                    )
                        ? currentValues.reciter
                        : (fallbackReciter?.id ?? currentValues.reciter),
            };
        });
    }

    async function savePreferences() {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const result = await updatePreferences(values);
            if (!result.success) {
                toast.error(commonT("feedback.preferencesUpdateFailed"));
                return;
            }
            setTheme(values.theme);
            setPreferences(values);
            router.refresh();
            toast.success(t("footer.success"));
        } catch {
            toast.error(commonT("feedback.preferencesUpdateFailed"));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form
            className="mt-6"
            onSubmit={(event) => {
                event.preventDefault();
                savePreferences();
            }}
        >
            <div className="space-y-5">
                <div className="space-y-5">
                    <SettingsSection
                        eyebrow={t("sections.appearance.eyebrow")}
                        title={t("sections.appearance.title")}
                    >
                        <section className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold">
                                    {t("theme.title")}
                                </h3>
                                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                                    {t("theme.description")}
                                </p>
                            </div>
                            <ThemeSelector
                                value={values.theme}
                                onChange={(theme) =>
                                    updateValue("theme", theme)
                                }
                                disabled={isSaving}
                            />
                        </section>

                        <PreferenceCard
                            title={t("language.title")}
                            description={t("language.description")}
                        >
                            <SettingField
                                label={t("language.label")}
                                htmlFor="language"
                            >
                                <Select
                                    dir={direction}
                                    value={values.language}
                                    onValueChange={(value) =>
                                        updateValue(
                                            "language",
                                            value as Language,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="language"
                                        className={selectClassName}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        <SelectItem value="en">
                                            {t("language.english")}
                                        </SelectItem>
                                        <SelectItem value="ar">
                                            {t("language.arabic")}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingField>
                        </PreferenceCard>

                        <PreferenceCard
                            title={t("arabicTextSize.title")}
                            description={t("arabicTextSize.description")}
                        >
                            <div
                                className={`quran-font-step-${values.arabicTextSize} space-y-3`}
                            >
                                <div className="grid h-24 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-1 text-center">
                                    <div className="flex min-h-0 min-w-0 items-center justify-center overflow-auto">
                                        <p
                                            dir="rtl"
                                            lang="ar"
                                            className="ayah quran-display-text leading-[1.9] text-foreground transition-[font-size] duration-200"
                                        >
                                            {t("arabicTextSize.preview")}
                                        </p>
                                    </div>
                                    <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground">
                                        {t("arabicTextSize.step", {
                                            current: values.arabicTextSize,
                                            total: 5,
                                        })}
                                    </p>
                                </div>
                                <SettingField
                                    label={t("arabicTextSize.label")}
                                    htmlFor="arabic-text-size"
                                >
                                    <Slider
                                        id="arabic-text-size"
                                        dir="ltr"
                                        min={1}
                                        max={5}
                                        step={1}
                                        value={[values.arabicTextSize]}
                                        onValueChange={(nextValue) =>
                                            updateValue(
                                                "arabicTextSize",
                                                nextValue[0] as ArabicTextSize,
                                            )
                                        }
                                        aria-label={t("arabicTextSize.label")}
                                        aria-valuetext={t(
                                            "arabicTextSize.step",
                                            {
                                                current: values.arabicTextSize,
                                                total: 5,
                                            },
                                        )}
                                    />
                                </SettingField>
                                <div
                                    aria-hidden="true"
                                    dir="ltr"
                                    className="grid grid-cols-5 text-center text-[0.65rem] text-muted-foreground"
                                >
                                    {[1, 2, 3, 4, 5].map((step) => (
                                        <span
                                            key={step}
                                            className={cn(
                                                "transition-colors",
                                                step ===
                                                    values.arabicTextSize &&
                                                    "font-semibold text-primary",
                                            )}
                                        >
                                            {step}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </PreferenceCard>
                    </SettingsSection>

                    <SettingsSection
                        eyebrow={t("sections.readingFlow.eyebrow")}
                        title={t("sections.readingFlow.title")}
                    >
                        <PreferenceCard
                            title={t("readingMode.title")}
                            description={t("readingMode.description")}
                        >
                            <SettingField
                                label={t("readingMode.label")}
                                htmlFor="readingMode"
                            >
                                <Select
                                    dir={direction}
                                    value={values.readingMode}
                                    onValueChange={(value) =>
                                        updateReadingMode(value as ReadingMode)
                                    }
                                >
                                    <SelectTrigger
                                        id="readingMode"
                                        className={selectClassName}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        <SelectItem value="page">
                                            {t("readingMode.page")}
                                        </SelectItem>
                                        <SelectItem value="surah">
                                            {t("readingMode.surah")}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingField>
                        </PreferenceCard>

                        <PreferenceCard
                            title={t("riwayah.title")}
                            description={t("riwayah.description")}
                        >
                            <SettingField
                                label={t("riwayah.label")}
                                htmlFor="riwayah"
                            >
                                <Select
                                    dir={direction}
                                    value={values.riwayah}
                                    onValueChange={(value) =>
                                        updateRiwayah(value as Riwayah)
                                    }
                                >
                                    <SelectTrigger
                                        id="riwayah"
                                        className={selectClassName}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        <SelectItem value="hafs">
                                            {t("riwayah.hafs")}
                                        </SelectItem>
                                        <SelectItem value="warsh">
                                            {t("riwayah.warsh")}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingField>
                        </PreferenceCard>

                        <PreferenceCard
                            title={t("translationVisibility.title")}
                            description={t("translationVisibility.description")}
                        >
                            <div className="flex min-h-11 items-center justify-between gap-4 px-1">
                                <label
                                    htmlFor="show-translation"
                                    className="cursor-pointer text-sm font-medium"
                                >
                                    {values.showTranslation
                                        ? t("translationVisibility.shown")
                                        : t("translationVisibility.hidden")}
                                </label>
                                <Checkbox
                                    id="show-translation"
                                    checked={values.showTranslation}
                                    onCheckedChange={(checked) =>
                                        updateValue(
                                            "showTranslation",
                                            checked === true,
                                        )
                                    }
                                />
                            </div>
                        </PreferenceCard>

                        <PreferenceCard
                            title={t("device.awakeTitle")}
                            description={t("device.awakeDescription")}
                        >
                            <label
                                htmlFor="keep-screen-awake"
                                className="flex min-h-11 items-center justify-between gap-4 text-sm"
                            >
                                {t("device.awakeTitle")}
                                <Checkbox
                                    id="keep-screen-awake"
                                    checked={values.keepScreenAwake}
                                    onCheckedChange={(checked) =>
                                        updateValue(
                                            "keepScreenAwake",
                                            checked === true,
                                        )
                                    }
                                />
                            </label>
                        </PreferenceCard>
                        <PreferenceCard
                            title={t("device.vibrationTitle")}
                            description={t("device.vibrationDescription")}
                        >
                            <div
                                id="device-feedback"
                                className="grid grid-cols-3 gap-2"
                            >
                                {(["off", "gentle", "strong"] as const).map(
                                    (mode) => (
                                        <Button
                                            key={mode}
                                            type="button"
                                            variant={
                                                values.vibration === mode
                                                    ? "default"
                                                    : "outline"
                                            }
                                            aria-pressed={
                                                values.vibration === mode
                                            }
                                            onClick={() => {
                                                updateValue("vibration", mode);
                                                vibrate(mode);
                                            }}
                                        >
                                            {t(`device.${mode}`)}
                                        </Button>
                                    ),
                                )}
                            </div>
                        </PreferenceCard>
                        <PreferenceCard
                            title={t("continuousRecitation.title")}
                            description={t("continuousRecitation.description")}
                        >
                            <div className="flex min-h-11 items-center justify-between gap-4 px-1">
                                <label
                                    htmlFor="continuous-recitation"
                                    className="cursor-pointer text-sm font-medium"
                                >
                                    {values.continuousRecitation
                                        ? t("continuousRecitation.automatic")
                                        : t("continuousRecitation.manual")}
                                </label>
                                <Checkbox
                                    id="continuous-recitation"
                                    checked={values.continuousRecitation}
                                    onCheckedChange={(checked) =>
                                        updateValue(
                                            "continuousRecitation",
                                            checked === true,
                                        )
                                    }
                                />
                            </div>
                        </PreferenceCard>
                    </SettingsSection>

                    <SettingsSection
                        eyebrow={t("sections.notifications.eyebrow")}
                        title={t("sections.notifications.title")}
                    >
                        <PushNotificationSetting
                            vapidPublicKey={vapidPublicKey}
                            reminderPreferences={{
                                wirdRemindersEnabled:
                                    values.wirdRemindersEnabled,
                                meetingRemindersEnabled:
                                    values.meetingRemindersEnabled,
                                assignmentRemindersEnabled:
                                    values.assignmentRemindersEnabled,
                            }}
                            onReminderPreferenceChange={(key, enabled) =>
                                updateValue(key, enabled)
                            }
                        />
                        <AdhkarReminderSettings
                            values={values}
                            onChange={updateValue}
                        />
                    </SettingsSection>

                    <SettingsSection
                        eyebrow={t("sections.offline.eyebrow")}
                        title={t("sections.offline.title")}
                    >
                        <PreferenceCard
                            title={t("offline.title")}
                            description={t("offline.description")}
                        >
                            <OfflineLibrarySetting />
                        </PreferenceCard>
                    </SettingsSection>
                </div>

                <SettingsSection
                    eyebrow={t("sections.quranText.eyebrow")}
                    title={t("sections.quranText.title")}
                >
                    <PreferenceCard
                        title={t("arabicEdition.title")}
                        description={
                            values.riwayah === "warsh"
                                ? t("arabicEdition.warshDescription")
                                : t("arabicEdition.description")
                        }
                    >
                        <SettingField
                            label={t("arabicEdition.label")}
                            htmlFor="arabic-edition"
                        >
                            <EditionCombobox
                                id="arabic-edition"
                                editions={availableArabicEditions}
                                value={values.arabicEdition}
                                onValueChange={(value) =>
                                    updateValue("arabicEdition", value)
                                }
                                disabled={values.riwayah === "warsh"}
                                placeholder={t("arabicEdition.placeholder")}
                                className={selectClassName}
                                emptyMessage={t("arabicEdition.empty")}
                                getBadge={() => t("arabicEdition.badge")}
                            />
                        </SettingField>
                    </PreferenceCard>

                    <PreferenceCard
                        title={t("reciter.title")}
                        description={t("reciter.description")}
                    >
                        <SettingField
                            label={t("reciter.label")}
                            htmlFor="reciter"
                        >
                            <div className="flex min-w-0 items-center gap-1">
                                <div className="min-w-0 flex-1">
                                    <ReciterCombobox
                                        id="reciter"
                                        reciters={availableReciters}
                                        value={values.reciter}
                                        onValueChange={(value) =>
                                            updateValue("reciter", value)
                                        }
                                        placeholder={t("reciter.placeholder")}
                                        className={selectClassName}
                                        emptyMessage={t("reciter.empty")}
                                        groupBy={(reciter) =>
                                            reciter.scope === "surah"
                                                ? t("reciter.wholeSurah")
                                                : t("reciter.ayahByAyah")
                                        }
                                        getBadge={(reciter) =>
                                            reciter.bitrate_kbps
                                                ? `${reciter.bitrate_kbps} kbps`
                                                : reciter.host.replace("_", " ")
                                        }
                                    />
                                </div>
                                <ReciterCoverage
                                    reciter={reciters.find(
                                        (r) => r.id === values.reciter,
                                    )}
                                    surahs={surahs}
                                />
                            </div>
                        </SettingField>
                    </PreferenceCard>

                    <PreferenceCard
                        title={t("translation.title")}
                        description={t("translation.description")}
                    >
                        <SettingField
                            label={t("translation.label")}
                            htmlFor="translation-edition"
                        >
                            <EditionCombobox
                                id="translation-edition"
                                editions={translationEditions}
                                value={values.translationEdition}
                                onValueChange={(value) =>
                                    updateValue("translationEdition", value)
                                }
                                placeholder={t("translation.placeholder")}
                                className={selectClassName}
                                emptyMessage={t("translation.empty")}
                                getLabel={(edition) => {
                                    const key =
                                        TRANSLATION_NAME_KEYS[
                                            edition.identifier as keyof typeof TRANSLATION_NAME_KEYS
                                        ];

                                    return locale === "ar" && key
                                        ? t(`translation.editions.${key}`)
                                        : edition.englishName || edition.name;
                                }}
                            />
                        </SettingField>
                    </PreferenceCard>

                    <PreferenceCard
                        title={t("tafsir.title")}
                        description={t("tafsir.description")}
                    >
                        <SettingField
                            label={t("tafsir.label")}
                            htmlFor="tafsir-edition"
                        >
                            <EditionCombobox
                                id="tafsir-edition"
                                editions={tafsirEditions}
                                value={values.tafsirEdition}
                                onValueChange={(value) =>
                                    updateValue("tafsirEdition", value)
                                }
                                placeholder={t("tafsir.placeholder")}
                                className={selectClassName}
                                emptyMessage={t("tafsir.empty")}
                            />
                        </SettingField>
                    </PreferenceCard>
                </SettingsSection>
            </div>

            <div className="sticky bottom-0 z-20 mt-6 flex flex-col gap-3 rounded-t-xl border border-border/70 bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                    {t("footer.note")}
                </p>
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="min-h-11 w-full rounded-xl px-6 shadow-sm shadow-primary/10 sm:w-auto"
                >
                    {isSaving ? t("footer.saving") : t("footer.save")}
                </Button>
            </div>
        </form>
    );
}
