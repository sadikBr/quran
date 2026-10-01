"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/auth-client";
import { clearDevicePushSubscription } from "@/features/notifications/device-subscription";
import ThemeSelector from "@/features/settings/components/theme-selector";
import {
    DEFAULT_PREFERENCES,
    type Theme,
} from "@/features/settings/preferences";
import updatePreferences from "@/features/settings/server/update-preferences";
import { useSettings } from "@/features/settings/settings-provider";

export default function useAccountMenuActions(focusMenu: () => void) {
    const { setTheme } = useTheme();
    const locale = useLocale();
    const commonT = useTranslations("Common");
    const { setPreferences, ...preferences } = useSettings();
    const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const savingRef = useRef(false);
    const settingsT = useTranslations("Settings");
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function changeTheme(theme: Theme) {
        if (savingRef.current || theme === preferences.theme) return;
        savingRef.current = true;
        const previousTheme = preferences.theme;
        setPendingTheme(theme);
        setTheme(theme);
        try {
            const result = await updatePreferences({ ...preferences, theme });
            if (!result.success) throw new Error("Theme save failed");
            setPreferences((current) => ({ ...current, theme }));
        } catch {
            setTheme(previousTheme);
            toast.error(commonT("feedback.preferencesUpdateFailed"));
        } finally {
            savingRef.current = false;
            setPendingTheme(null);
        }
    }

    function signOut() {
        if (isSigningOut) return;
        setIsSigningOut(true);
        authClient.signOut({
            fetchOptions: {
                onSuccess: async () => {
                    await clearDevicePushSubscription().catch(() => {});
                    setTheme(DEFAULT_PREFERENCES.theme);
                    window.location.assign("/");
                },
                onError: () => {
                    setIsSigningOut(false);
                    toast.error(commonT("feedback.signOutFailed"));
                },
            },
        });
    }

    const appearanceDialog = (
        <Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    lang={locale}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        focusMenu();
                    }}
                    className={`fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl border bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-xl outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(48rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6 ${locale === "ar" ? "arabic-ui" : ""}`}
                >
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <Dialog.Title className="text-lg font-semibold">
                                {settingsT("theme.title")}
                            </Dialog.Title>
                            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                                {settingsT("theme.quickHint")}
                            </Dialog.Description>
                        </div>
                        <Dialog.Close
                            aria-label={commonT("navigation.close")}
                            className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                        >
                            <X className="size-5" aria-hidden="true" />
                        </Dialog.Close>
                    </div>
                    <ThemeSelector
                        value={pendingTheme ?? preferences.theme}
                        onChange={changeTheme}
                        disabled={pendingTheme !== null}
                    />
                    <output className="mt-3 block min-h-5 text-xs text-muted-foreground">
                        {pendingTheme !== null
                            ? settingsT("footer.saving")
                            : ""}
                    </output>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
    return {
        appearanceDialog,
        openAppearance: () => setPickerOpen(true),
        signOut,
        isSigningOut,
    };
}
