"use client";

import { BookOpen, Languages, Palette, SlidersHorizontal } from "lucide-react";
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
}: {
    preferences: Preferences;
    arabicEditions: Edition[];
    translationEditions: Edition[];
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
            className="mt-8"
            onSubmit={(event) => {
                event.preventDefault();
                savePreferences();
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <PreferenceCard
                    icon={Palette}
                    title="Appearance"
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

                <PreferenceCard
                    icon={Palette}
                    title="Reading Mode"
                    description="Choose the way you would like to read the quran."
                >
                    <SettingField label="Reading Mode" htmlFor="readingMode">
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
                    icon={BookOpen}
                    title="Arabic edition"
                    description="The Quran text edition used in the reader."
                >
                    <SettingField label="Edition" htmlFor="arabic-edition">
                        <select
                            id="arabic-edition"
                            value={values.arabicEdition}
                            onChange={(event) =>
                                updateValue("arabicEdition", event.target.value)
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
                    icon={Languages}
                    title="Translation"
                    description="Set the English translation shown with the Arabic text."
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
                    icon={SlidersHorizontal}
                    title="Reading display"
                    description="Control whether translations appear below each surah."
                >
                    <label
                        htmlFor="show-translation"
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-md border bg-background/60 px-3 py-2.5"
                    >
                        <span>
                            <span className="block text-sm font-medium">
                                Show translation
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                Display English beneath the Arabic text.
                            </span>
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
            </div>

            <div className="mt-6 flex justify-end border-t pt-6">
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save preferences"}
                </Button>
            </div>
        </form>
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
