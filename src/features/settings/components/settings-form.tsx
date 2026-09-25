"use client";

import { useRouter } from "next/navigation";
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
import EditionCombobox from "@/features/quran/components/edition-combobox";
import ReciterCombobox from "@/features/quran/components/reciter-combobox";
import type { Edition, Reciter } from "@/features/quran/types";
import { useSettings } from "@/features/settings/settings-provider";
import {
    isArabicTextEditionCompatible,
    isReciterCompatible,
} from "../edition-compatibility";
import {
    DEFAULT_PREFERENCES,
    type Preferences,
    type ReadingMode,
    type Riwayah,
    type Theme,
} from "../preferences";
import updatePreferences from "../server/update-preferences";
import PreferenceCard from "./settings-card";
import SettingField from "./settings-field";
import SettingsSection from "./settings-section";

export default function SettingsForm({
    preferences,
    arabicEditions,
    reciters,
    translationEditions,
    tafsirEditions,
}: {
    preferences: Preferences;
    arabicEditions: Edition[];
    reciters: Reciter[];
    translationEditions: Edition[];
    tafsirEditions: Edition[];
}) {
    const router = useRouter();
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
        "w-full border-0 bg-muted/55 shadow-none hover:bg-muted/75 focus-visible:ring-1";

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
        setIsSaving(true);

        const result = await updatePreferences(values);

        setIsSaving(false);

        if (!result.success) {
            toast.error(result.message);
            return;
        }

        setTheme(values.theme);
        setPreferences(values);
        router.refresh();
        toast.success("Your reading preferences have been saved.");
    }

    return (
        <form
            className="mt-12"
            onSubmit={(event) => {
                event.preventDefault();
                savePreferences();
            }}
        >
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-x-16">
                <div className="space-y-12">
                    <SettingsSection
                        eyebrow="APPEARANCE"
                        title="A comfortable environment"
                    >
                        <PreferenceCard
                            title="Theme"
                            description="Choose how the application looks across every page."
                        >
                            <SettingField label="Theme" htmlFor="theme">
                                <Select
                                    value={values.theme}
                                    onValueChange={(value) =>
                                        updateValue("theme", value as Theme)
                                    }
                                >
                                    <SelectTrigger
                                        id="theme"
                                        className={selectClassName}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        <SelectItem value="system">
                                            System
                                        </SelectItem>
                                        <SelectItem value="light">
                                            Light
                                        </SelectItem>
                                        <SelectItem value="dark">
                                            Dark
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingField>
                        </PreferenceCard>
                    </SettingsSection>

                    <SettingsSection
                        eyebrow="READING FLOW"
                        title="Follow your own pace"
                    >
                        <PreferenceCard
                            title="Reading mode"
                            description="Choose the way you would like to move through the Quran."
                        >
                            <SettingField
                                label="Reading mode"
                                htmlFor="readingMode"
                            >
                                <Select
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
                                            Read by page
                                        </SelectItem>
                                        <SelectItem value="surah">
                                            Read by surah
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingField>
                        </PreferenceCard>

                        <PreferenceCard
                            title="Riwayah"
                            description="Choose the Quranic transmission used for Arabic text and recitation."
                        >
                            <SettingField label="Riwayah" htmlFor="riwayah">
                                <Select
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
                                            Hafs ‘an ‘Asim
                                        </SelectItem>
                                        <SelectItem value="warsh">
                                            Warsh ‘an Nafi‘
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingField>
                        </PreferenceCard>

                        <PreferenceCard
                            title="Show translation"
                            description="Display English beneath the Arabic text."
                        >
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/45 px-3 py-2.5">
                                <label
                                    htmlFor="show-translation"
                                    className="cursor-pointer text-sm font-medium"
                                >
                                    {values.showTranslation
                                        ? "Shown"
                                        : "Hidden"}
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
                            title="Continuous recitation"
                            description="After an ayah finishes, continue with the next ayah in your current reading view."
                        >
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/45 px-3 py-2.5">
                                <label
                                    htmlFor="continuous-recitation"
                                    className="cursor-pointer text-sm font-medium"
                                >
                                    {values.continuousRecitation
                                        ? "Continue automatically"
                                        : "Ayah by ayah"}
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
                </div>

                <SettingsSection
                    eyebrow="QURAN TEXT"
                    title="Choose your editions"
                >
                    <PreferenceCard
                        title="Arabic edition"
                        description={
                            values.riwayah === "warsh"
                                ? "Warsh uses its dedicated Quran script; your Hafs edition remains saved for when you switch back."
                                : "Choose the Arabic text style used throughout the reader."
                        }
                    >
                        <SettingField label="Edition" htmlFor="arabic-edition">
                            <EditionCombobox
                                id="arabic-edition"
                                editions={availableArabicEditions}
                                value={values.arabicEdition}
                                onValueChange={(value) =>
                                    updateValue("arabicEdition", value)
                                }
                                disabled={values.riwayah === "warsh"}
                                placeholder="Search text editions…"
                                className={selectClassName}
                                getBadge={() => "Text"}
                            />
                        </SettingField>
                    </PreferenceCard>

                    <PreferenceCard
                        title="Reciter"
                        description="Choose the voice used for ayah playback and full recitation."
                    >
                        <SettingField label="Reciter" htmlFor="reciter">
                            <ReciterCombobox
                                id="reciter"
                                reciters={availableReciters}
                                value={values.reciter}
                                onValueChange={(value) =>
                                    updateValue("reciter", value)
                                }
                                placeholder="Search reciters…"
                                className={selectClassName}
                                groupBy={(reciter) =>
                                    reciter.scope === "surah"
                                        ? "Whole-surah reciters"
                                        : "Ayah-by-ayah reciters"
                                }
                                getBadge={(reciter) =>
                                    reciter.bitrate_kbps
                                        ? `${reciter.bitrate_kbps} kbps`
                                        : reciter.host.replace("_", " ")
                                }
                            />
                        </SettingField>
                        <p className="text-xs leading-5 text-muted-foreground">
                            {values.readingMode === "surah"
                                ? "Surah mode supports ayah-by-ayah and whole-surah reciters."
                                : "Page mode uses reciters with audio for each ayah."}
                        </p>
                    </PreferenceCard>

                    <PreferenceCard
                        title="English translation"
                        description="Set the translation shown alongside the Arabic text."
                    >
                        <SettingField
                            label="English edition"
                            htmlFor="translation-edition"
                        >
                            <EditionCombobox
                                id="translation-edition"
                                editions={translationEditions}
                                value={values.translationEdition}
                                onValueChange={(value) =>
                                    updateValue("translationEdition", value)
                                }
                                placeholder="Search translations…"
                                className={selectClassName}
                            />
                        </SettingField>
                    </PreferenceCard>

                    <PreferenceCard
                        title="Tafsir edition"
                        description="Choose the commentary that will be used when you explore an ayah."
                    >
                        <SettingField label="Tafsir" htmlFor="tafsir-edition">
                            <EditionCombobox
                                id="tafsir-edition"
                                editions={tafsirEditions}
                                value={values.tafsirEdition}
                                onValueChange={(value) =>
                                    updateValue("tafsirEdition", value)
                                }
                                placeholder="Search tafsir editions…"
                                className={selectClassName}
                            />
                        </SettingField>
                    </PreferenceCard>
                </SettingsSection>
            </div>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">
                    Changes will apply to your next reading session.
                </p>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save preferences"}
                </Button>
            </div>
        </form>
    );
}
