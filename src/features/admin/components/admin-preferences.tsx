"use client";

import {
    Check,
    Languages,
    Loader2,
    Monitor,
    Moon,
    Palette,
    Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    LANGUAGES,
    type Preferences,
    THEMES,
} from "@/features/settings/preferences";
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
        <form
            className="mt-8 max-w-4xl overflow-hidden rounded-2xl border bg-card/60 shadow-sm"
            action={save}
        >
            <fieldset
                disabled={pending}
                className="min-w-0 divide-y disabled:opacity-70"
            >
                <fieldset className="min-w-0 p-5 sm:p-8">
                    <legend className="sr-only">{t("language.title")}</legend>
                    <div className="mb-5 flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Languages className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h2 className="font-semibold">
                                {t("language.title")}
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {t("language.description")}
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {LANGUAGES.map((value) => (
                            <label
                                key={value}
                                className="relative cursor-pointer"
                            >
                                <input
                                    type="radio"
                                    name="admin-language"
                                    value={value}
                                    checked={language === value}
                                    onChange={() => setLanguage(value)}
                                    className="peer sr-only"
                                />
                                <span className="flex min-h-20 items-center gap-4 rounded-xl border bg-background/60 px-4 py-3 transition-colors hover:bg-muted/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                                    <span
                                        aria-hidden="true"
                                        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-medium"
                                    >
                                        {value === "ar" ? "ع" : "Aa"}
                                    </span>
                                    <span className="flex-1">
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
                <fieldset className="min-w-0 p-5 sm:p-8">
                    <legend className="sr-only">{t("theme.title")}</legend>
                    <div className="mb-5 flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Palette className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h2 className="font-semibold">
                                {t("theme.title")}
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {t("theme.description")}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {THEMES.map((value) => {
                            const Icon =
                                value === "light"
                                    ? Sun
                                    : value === "dark"
                                      ? Moon
                                      : Monitor;
                            return (
                                <label
                                    key={value}
                                    className="relative min-w-0 cursor-pointer"
                                >
                                    <input
                                        type="radio"
                                        name="admin-theme"
                                        value={value}
                                        checked={theme === value}
                                        onChange={() => setSelectedTheme(value)}
                                        className="peer sr-only"
                                    />
                                    <span className="block overflow-hidden rounded-xl border bg-background/60 p-2 transition-colors hover:bg-muted/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 sm:p-3">
                                        <span
                                            aria-hidden="true"
                                            className={`relative flex h-20 overflow-hidden rounded-md border border-black/10 p-2 sm:h-28 sm:p-3 ${value === "light" ? "bg-[#faf7f2]" : value === "dark" ? "bg-[#211d19]" : "bg-linear-to-r from-[#faf7f2] from-50% to-[#211d19] to-50%"}`}
                                        >
                                            <span className="w-1/4 rounded-sm bg-stone-500/20" />
                                            <span className="ms-2 flex-1 space-y-2 pt-1">
                                                <span className="block h-2 w-2/3 rounded-sm bg-orange-500/70" />
                                                <span className="block h-2 rounded-sm bg-stone-500/25" />
                                                <span className="block h-6 rounded-sm border border-stone-500/20 bg-stone-500/10" />
                                            </span>
                                        </span>
                                        <span className="mt-3 flex flex-wrap items-center justify-center gap-1.5 pb-1 text-xs font-medium sm:text-sm">
                                            <Icon
                                                className="size-4 shrink-0"
                                                aria-hidden="true"
                                            />
                                            {t(`theme.${value}`)}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
                <div className="flex justify-end bg-muted/20 px-5 py-4 sm:px-8">
                    <Button disabled={pending} className="w-full sm:w-auto">
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
