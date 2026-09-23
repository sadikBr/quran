"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Edition } from "@/features/quran/types";
import type { Preferences, ReadingMode, Theme } from "../preferences";
import updatePreferences from "../server/update-preferences";
import PreferenceCard from "./settings-card";

export default function SettingsForm({
    preferences,
    arabicEditions,
    translationEditions,
    tafsirEditions,
}: {
    preferences: Preferences;
    arabicEditions: Edition[];
    translationEditions: Edition[];
    tafsirEditions: Edition[];
}) {
    const router = useRouter();
    const { setTheme } = useTheme();
    const [values, setValues] = useState(preferences);
    const [isSaving, setIsSaving] = useState(false);

    function updateValue<Key extends keyof Preferences>(
        key: Key,
        value: Preferences[Key],
    ) {
        setValues((currentValues) => ({ ...currentValues, [key]: value }));
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
                                <select
                                    id="theme"
                                    value={values.theme}
                                    onChange={(event) =>
                                        updateValue(
                                            "theme",
                                            event.target.value as Theme,
                                        )
                                    }
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="system">System</option>
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </select>
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
                                <select
                                    id="readingMode"
                                    value={values.readingMode}
                                    onChange={(event) =>
                                        updateValue(
                                            "readingMode",
                                            event.target.value as ReadingMode,
                                        )
                                    }
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="page">Read by page</option>
                                    <option value="surah">Read by surah</option>
                                </select>
                            </SettingField>
                        </PreferenceCard>

                        <PreferenceCard
                            title="Show translation"
                            description="Display English beneath the Arabic text."
                        >
                            <label
                                htmlFor="show-translation"
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2.5"
                            >
                                <span className="text-sm font-medium">
                                    {values.showTranslation
                                        ? "Shown"
                                        : "Hidden"}
                                </span>
                                <input
                                    id="show-translation"
                                    type="checkbox"
                                    checked={values.showTranslation}
                                    onChange={(event) =>
                                        updateValue(
                                            "showTranslation",
                                            event.target.checked,
                                        )
                                    }
                                    className="size-4 accent-primary"
                                />
                            </label>
                        </PreferenceCard>
                    </SettingsSection>
                </div>

                <SettingsSection
                    eyebrow="QURAN TEXT"
                    title="Choose your editions"
                >
                    <PreferenceCard
                        title="Arabic edition"
                        description="The Quran text edition used in the reader."
                    >
                        <SettingField label="Edition" htmlFor="arabic-edition">
                            <select
                                id="arabic-edition"
                                value={values.arabicEdition}
                                onChange={(event) =>
                                    updateValue(
                                        "arabicEdition",
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {arabicEditions.map((edition) => (
                                    <option
                                        key={edition.identifier}
                                        value={edition.identifier}
                                    >
                                        {edition.englishName || edition.name}
                                    </option>
                                ))}
                            </select>
                        </SettingField>
                    </PreferenceCard>

                    <PreferenceCard
                        title="English translation"
                        description="Set the translation shown alongside the Arabic text."
                    >
                        <SettingField
                            label="English edition"
                            htmlFor="translation-edition"
                        >
                            <select
                                id="translation-edition"
                                value={values.translationEdition}
                                onChange={(event) =>
                                    updateValue(
                                        "translationEdition",
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {translationEditions.map((edition) => (
                                    <option
                                        key={edition.identifier}
                                        value={edition.identifier}
                                    >
                                        {edition.englishName || edition.name}
                                    </option>
                                ))}
                            </select>
                        </SettingField>
                    </PreferenceCard>

                    <PreferenceCard
                        title="Tafsir edition"
                        description="Choose the commentary that will be used when you explore an ayah."
                    >
                        <SettingField label="Tafsir" htmlFor="tafsir-edition">
                            <select
                                id="tafsir-edition"
                                value={values.tafsirEdition}
                                onChange={(event) =>
                                    updateValue(
                                        "tafsirEdition",
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {tafsirEditions.map((edition) => (
                                    <option
                                        key={edition.identifier}
                                        value={edition.identifier}
                                    >
                                        {edition.englishName || edition.name}
                                    </option>
                                ))}
                            </select>
                        </SettingField>
                    </PreferenceCard>
                </SettingsSection>
            </div>

            <div className="mt-4 flex flex-col gap-4 border-t border-primary/15 pt-7 sm:flex-row sm:items-center sm:justify-between">
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

function SettingsSection({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section>
            <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                {eyebrow}
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
                {title}
            </h2>
            <div className="mt-5 divide-y border-y border-primary/15">
                {children}
            </div>
        </section>
    );
}

function SettingField({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-2 block text-xs font-medium text-muted-foreground"
            >
                {label}
            </label>
            {children}
        </div>
    );
}
