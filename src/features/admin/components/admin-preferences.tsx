"use client";

import { Check, Languages, Loader2, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import SectionHeading from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import ThemeSelector from "@/features/settings/components/theme-selector";
import { LANGUAGES, type Preferences } from "@/features/settings/preferences";
import updatePreferences from "@/features/settings/server/update-preferences";
import { useSettings } from "@/features/settings/settings-provider";

export default function AdminPreferences({
    preferences,
}: {
    preferences: Preferences;
}) {
    const t = useTranslations("Settings");
    const commonT = useTranslations("Common");
    const { setPreferences } = useSettings();
    const { setTheme } = useTheme();
    const router = useRouter();
    const [language, setLanguage] = useState(preferences.language);
    const [theme, setSelectedTheme] = useState(preferences.theme);
    const [pending, setPending] = useState(false);
    async function save() {
        setPending(true);
        const values = {
            ...preferences,
            language,
            theme,
            wirdRemindersEnabled: false,
            meetingRemindersEnabled: false,
            assignmentRemindersEnabled: false,
        };
        try {
            const result = await updatePreferences(values);
            if (!result.success) {
                toast.error(commonT("feedback.preferencesUpdateFailed"));
                return;
            }
            setPreferences(values);
            setTheme(theme);
            router.refresh();
            toast.success(t("footer.success"));
        } catch {
            toast.error(commonT("feedback.preferencesUpdateFailed"));
        } finally {
            setPending(false);
        }
    }
    return (
        <form className="min-w-0" aria-busy={pending} action={save}>
            <fieldset
                disabled={pending}
                className="min-w-0 space-y-5 disabled:opacity-70 sm:space-y-6"
            >
                <fieldset className="app-card min-w-0 p-4 sm:p-6">
                    <legend className="sr-only">{t("language.title")}</legend>
                    <SectionHeading
                        title={t("language.title")}
                        description={t("language.description")}
                        icon={<Languages />}
                        className="mb-5"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        {LANGUAGES.map((value) => (
                            <label
                                key={value}
                                className="relative min-w-0 cursor-pointer"
                            >
                                <input
                                    type="radio"
                                    name="admin-language"
                                    value={value}
                                    checked={language === value}
                                    onChange={() => setLanguage(value)}
                                    className="peer sr-only"
                                />
                                <span className="flex min-h-20 items-center gap-4 rounded-xl border border-border/60 bg-background/50 px-4 py-3 transition-colors hover:bg-muted/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card">
                                    <span
                                        aria-hidden="true"
                                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-medium text-primary"
                                    >
                                        {value === "ar" ? "ع" : "Aa"}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span
                                            lang={value}
                                            className="block font-medium"
                                        >
                                            {value === "ar"
                                                ? "العربية"
                                                : "English"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {t(
                                                value === "ar"
                                                    ? "language.arabic"
                                                    : "language.english",
                                            )}
                                        </span>
                                    </span>
                                    <span className="flex size-5 items-center justify-center rounded-full border text-primary">
                                        {language === value && (
                                            <Check
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset className="app-card min-w-0 p-4 sm:p-6">
                    <legend className="sr-only">{t("theme.title")}</legend>
                    <SectionHeading
                        title={t("theme.title")}
                        description={t("theme.description")}
                        icon={<Palette />}
                        className="mb-5"
                    />
                    <ThemeSelector
                        value={theme}
                        onChange={setSelectedTheme}
                        disabled={pending}
                    />
                </fieldset>
                <div className="app-card flex justify-end p-4 sm:p-5">
                    <Button
                        disabled={pending}
                        className="min-h-11 w-full sm:w-auto"
                    >
                        {pending && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {t(pending ? "footer.saving" : "footer.save")}
                    </Button>
                </div>
            </fieldset>
        </form>
    );
}
